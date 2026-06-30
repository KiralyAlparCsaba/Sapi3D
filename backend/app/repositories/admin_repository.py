from datetime import datetime, timezone, timedelta
from typing import List, Optional
from sqlalchemy import select, func, text, case, and_
from sqlalchemy.sql import literal
from sqlalchemy.ext.asyncio import AsyncSession

from models.session import Session, GuestLogin
from models.metrics import PerfMetrics
from models.user import User
from schemas.admin import (
    ActiveSessionInfo,
    DashboardOverview,
    MetricPoint,
    EngagementData,
    DeviceCount,
    DurationBucket,
    ModeCount,
    DeviceModeRow,
)


class AdminRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_dashboard_overview(self) -> DashboardOverview:
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        # Valóban aktív session-ök: ended_at IS NULL ÉS friss metrika vagy új session
        metric_cutoff  = now - timedelta(minutes=20)
        session_cutoff = now - timedelta(minutes=20)

        active_q = await self.db.execute(
            select(func.count()).where(
                Session.ended_at.is_(None),
                (
                    Session.session_id.in_(
                        select(PerfMetrics.session_id)
                        .where(PerfMetrics.timestamp >= metric_cutoff)
                    )
                ) | (
                    Session.started_at >= session_cutoff
                )
            )
        )
        active_sessions: int = active_q.scalar() or 0

        # Distinct online users (ugyanolyan szűréssel)
        online_q = await self.db.execute(
            select(func.count(func.distinct(Session.user_id)))
            .where(
                Session.ended_at.is_(None),
                (
                    Session.session_id.in_(
                        select(PerfMetrics.session_id)
                        .where(PerfMetrics.timestamp >= metric_cutoff)
                    )
                ) | (
                    Session.started_at >= session_cutoff
                )
            )
        )
        online_users: int = online_q.scalar() or 0

        # Global avg fps / memory / latency — csak az elmúlt 1 óra metrikáiból
        one_hour_ago = now - timedelta(hours=1)
        avg_q = await self.db.execute(
            select(
                func.coalesce(func.avg(PerfMetrics.fps), 0).label("avg_fps"),
                func.coalesce(func.avg(PerfMetrics.memory_mb), 0).label("avg_mem"),
                func.coalesce(func.avg(PerfMetrics.latency_ms), 0).label("avg_lat"),
            ).where(PerfMetrics.timestamp >= one_hour_ago)
        )
        avg_row = avg_q.one()

        # Avg session duration (closed sessions only, in minutes)
        dur_q = await self.db.execute(
            select(
                func.coalesce(
                    func.avg(
                        func.extract("epoch", Session.ended_at - Session.started_at) / 60
                    ),
                    0,
                ).label("avg_dur")
            ).where(Session.ended_at.isnot(None))
        )
        avg_duration: float = float(dur_q.scalar() or 0)

        # Sessions started today
        today_q = await self.db.execute(
            select(func.count()).where(Session.started_at >= today_start)
        )
        total_today: int = today_q.scalar() or 0

        # Total quality reductions across all metrics
        qr_q = await self.db.execute(
            select(func.coalesce(func.sum(PerfMetrics.quality_reductions), 0))
        )
        total_qr: int = int(qr_q.scalar() or 0)

        # Guest logins today
        guest_today_q = await self.db.execute(
            select(func.count()).where(GuestLogin.logged_at >= today_start)
        )
        guest_logins_today: int = guest_today_q.scalar() or 0

        # Guest logins this week
        week_start = now - timedelta(days=7)
        guest_week_q = await self.db.execute(
            select(func.count()).where(GuestLogin.logged_at >= week_start)
        )
        guest_logins_week: int = guest_week_q.scalar() or 0

        return DashboardOverview(
            active_sessions=active_sessions,
            online_users=online_users,
            avg_fps=round(float(avg_row.avg_fps), 1),
            avg_memory_mb=round(float(avg_row.avg_mem), 1),
            avg_latency_ms=round(float(avg_row.avg_lat), 1),
            avg_session_duration_minutes=round(avg_duration, 1),
            total_sessions_today=total_today,
            total_quality_reductions=total_qr,
            guest_logins_today=guest_logins_today,
            guest_logins_week=guest_logins_week,
        )

    async def get_active_sessions_with_metrics(self) -> List[ActiveSessionInfo]:
        """
        Csak valóban aktív session-öket ad vissza:
        - ended_at IS NULL  ÉS
        - (van metrikájuk az elmúlt 2 percből  VAGY  kevesebb mint 1 perce kezdődtek)

        A 30 másodperces periódikus metrika feltöltés miatt bármely valóban
        online user legfeljebb 30 másodpercenként küld adatot — ha 2 perce
        nem érkezett semmi, zombie session-nek tekintjük.
        """
        now = datetime.now(timezone.utc)
        metric_cutoff   = now - timedelta(minutes=20)  # legutóbbi metrika határ
        session_cutoff  = now - timedelta(minutes=20)  # friss session (még nem küldött metrikát)

        # Subquery: legutolsó metrika per session
        latest_metric_sq = (
            select(
                PerfMetrics.session_id,
                PerfMetrics.fps.label("latest_fps"),
                PerfMetrics.memory_mb.label("latest_memory_mb"),
                PerfMetrics.latency_ms.label("latest_latency_ms"),
                PerfMetrics.timestamp.label("latest_metric_at"),
            )
            .distinct(PerfMetrics.session_id)
            .order_by(PerfMetrics.session_id, PerfMetrics.timestamp.desc())
            .subquery()
        )

        result = await self.db.execute(
            select(
                Session.session_id,
                Session.user_id,
                User.username,
                Session.started_at,
                Session.device_type,
                Session.app_version,
                latest_metric_sq.c.latest_fps,
                latest_metric_sq.c.latest_memory_mb,
                latest_metric_sq.c.latest_latency_ms,
                latest_metric_sq.c.latest_metric_at,
            )
            .join(User, Session.user_id == User.user_id)
            .outerjoin(latest_metric_sq, Session.session_id == latest_metric_sq.c.session_id)
            .where(
                Session.ended_at.is_(None),
                # Valóban aktív: friss metrika VAGY éppen most kezdett session
                and_(
                    Session.ended_at.is_(None),
                    (
                        latest_metric_sq.c.latest_metric_at >= metric_cutoff
                    ) | (
                        Session.started_at >= session_cutoff
                    )
                )
            )
            .order_by(Session.started_at.desc())
        )

        rows = result.all()
        return [
            ActiveSessionInfo(
                session_id=r.session_id,
                user_id=r.user_id,
                username=r.username,
                started_at=r.started_at,
                device_type=r.device_type,
                app_version=r.app_version,
                latest_fps=r.latest_fps,
                latest_memory_mb=r.latest_memory_mb,
                latest_latency_ms=r.latest_latency_ms,
                latest_metric_at=r.latest_metric_at,
            )
            for r in rows
        ]

    async def get_metrics_history(self, hours: int = 24) -> List[MetricPoint]:
        """
        Returns hourly-bucketed avg FPS, memory, latency for the past N hours.
        Uses generate_series to include every hour slot — hours with no data
        get None values so the chart renders a visible gap instead of skipping
        that hour entirely (which caused large jumps on the X axis).
        """
        result = await self.db.execute(
            text("""
                WITH hours AS (
                    SELECT generate_series(
                        date_trunc('hour', NOW() AT TIME ZONE 'UTC'
                                   - make_interval(hours => :hours)),
                        date_trunc('hour', NOW() AT TIME ZONE 'UTC'),
                        interval '1 hour'
                    ) AS bucket
                )
                SELECT
                    hours.bucket,
                    AVG(m.fps)          AS avg_fps,
                    AVG(m.memory_mb)    AS avg_memory_mb,
                    AVG(m.latency_ms)   AS avg_latency_ms
                FROM hours
                LEFT JOIN perf_metrics m
                       ON date_trunc('hour', m.timestamp AT TIME ZONE 'UTC') = hours.bucket
                GROUP BY hours.bucket
                ORDER BY hours.bucket
            """),
            {"hours": hours},
        )

        rows = result.all()
        return [
            MetricPoint(
                timestamp=r.bucket,
                avg_fps=round(float(r.avg_fps), 1) if r.avg_fps is not None else None,
                avg_memory_mb=round(float(r.avg_memory_mb), 1) if r.avg_memory_mb is not None else None,
                avg_latency_ms=round(float(r.avg_latency_ms), 1) if r.avg_latency_ms is not None else None,
            )
            for r in rows
        ]

    async def get_engagement_data(self) -> EngagementData:
        # Device breakdown — count all sessions per device_type
        dev_q = await self.db.execute(
            select(
                func.coalesce(Session.device_type, "unknown").label("device_type"),
                func.count().label("cnt"),
            )
            .group_by(Session.device_type)
            .order_by(func.count().desc())
        )
        device_breakdown = [
            DeviceCount(device_type=r.device_type, count=r.cnt)
            for r in dev_q.all()
        ]

        # Session duration buckets (closed sessions only)
        duration_expr = (
            func.extract("epoch", Session.ended_at - Session.started_at) / 60
        )
        bucket_expr = case(
            (duration_expr < 5,  "0–5 perc"),
            (duration_expr < 10, "5–10 perc"),
            (duration_expr < 20, "10–20 perc"),
            (duration_expr < 30, "20–30 perc"),
            (duration_expr < 60, "30–60 perc"),
            else_="60+ perc",
        ).label("bucket")

        dur_q = await self.db.execute(
            select(bucket_expr, func.count().label("cnt"))
            .where(Session.ended_at.isnot(None))
            .group_by(text("bucket"))
        )

        # Preserve logical order
        bucket_order = ["0–5 perc", "5–10 perc", "10–20 perc", "20–30 perc", "30–60 perc", "60+ perc"]
        raw_buckets = {r.bucket: r.cnt for r in dur_q.all()}
        duration_buckets = [
            DurationBucket(label=label, count=raw_buckets.get(label, 0))
            for label in bucket_order
        ]

        # Play-mode breakdown — count metric rows per mode (each row = 30s)
        # NULL rows (old data before the column existed) are excluded entirely
        mode_q = await self.db.execute(
            select(
                PerfMetrics.play_mode.label("mode"),
                func.count().label("cnt"),
            )
            .where(PerfMetrics.play_mode.isnot(None))
            .group_by(PerfMetrics.play_mode)
            .order_by(func.count().desc())
        )
        mode_order = ["single", "multi"]
        raw_modes = {r.mode: r.cnt for r in mode_q.all()}
        mode_breakdown = [
            ModeCount(mode=m, count=raw_modes[m])
            for m in mode_order
            if m in raw_modes and raw_modes[m] > 0
        ]

        return EngagementData(
            device_breakdown=device_breakdown,
            duration_buckets=duration_buckets,
            mode_breakdown=mode_breakdown,
        )

    async def get_device_mode_metrics(self, hours: int = 24) -> List[DeviceModeRow]:
        """
        Returns avg FPS / memory / latency broken down by:
          - device_type × play_mode  (e.g. desktop + single)
          - device_type overall       (play_mode IS NULL row = all modes combined)

        Frontend builds the comparison table from these rows.
        """
        result = await self.db.execute(
            text("""
                -- Per device + mode (only known modes)
                SELECT
                    COALESCE(s.device_type, 'unknown')  AS device_type,
                    m.play_mode,
                    ROUND(AVG(m.fps)::numeric, 1)        AS avg_fps,
                    ROUND(AVG(m.memory_mb)::numeric, 1)  AS avg_memory_mb,
                    ROUND(AVG(m.latency_ms)::numeric, 1) AS avg_latency_ms,
                    COUNT(*)                              AS sample_count
                FROM perf_metrics m
                JOIN sessions s ON m.session_id = s.session_id
                WHERE m.timestamp >= NOW() AT TIME ZONE 'UTC' - make_interval(hours => :hours)
                  AND m.play_mode IS NOT NULL
                GROUP BY s.device_type, m.play_mode

                UNION ALL

                -- Per device overall (csak ismert módok: single + multi együtt)
                -- Ez biztosítja hogy az Átlag konzisztens legyen a Single/Multi értékekkel
                SELECT
                    COALESCE(s.device_type, 'unknown')  AS device_type,
                    NULL                                 AS play_mode,
                    ROUND(AVG(m.fps)::numeric, 1)        AS avg_fps,
                    ROUND(AVG(m.memory_mb)::numeric, 1)  AS avg_memory_mb,
                    ROUND(AVG(m.latency_ms)::numeric, 1) AS avg_latency_ms,
                    COUNT(*)                              AS sample_count
                FROM perf_metrics m
                JOIN sessions s ON m.session_id = s.session_id
                WHERE m.timestamp >= NOW() AT TIME ZONE 'UTC' - make_interval(hours => :hours)
                  AND m.play_mode IS NOT NULL
                GROUP BY s.device_type

                ORDER BY device_type, play_mode NULLS FIRST
            """),
            {"hours": hours},
        )

        rows = result.all()
        return [
            DeviceModeRow(
                device_type=r.device_type,
                play_mode=r.play_mode,
                avg_fps=float(r.avg_fps) if r.avg_fps is not None else None,
                avg_memory_mb=float(r.avg_memory_mb) if r.avg_memory_mb is not None else None,
                avg_latency_ms=float(r.avg_latency_ms) if r.avg_latency_ms is not None else None,
                sample_count=r.sample_count,
            )
            for r in rows
        ]
