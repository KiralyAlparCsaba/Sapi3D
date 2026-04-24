import asyncio
import smtplib
from pathlib import Path
from email.message import EmailMessage
from jinja2 import Environment, FileSystemLoader

from core.config import settings
from core.logging import logger

BASE_DIR = Path(__file__).resolve().parent.parent
TEMPLATE_DIR = BASE_DIR / "templates"
jinja_env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))

class EmailService:
    """Hivatalos stílusú e-mail szerviz a Sapi3D projekthez."""

    def _get_html_content(self, template_name: str, **kwargs) -> str:
        try:
            template = jinja_env.get_template(template_name)
            return template.render(**kwargs)
        except Exception as e:
            logger.error(f"Sablon hiba: {e}")
            raise RuntimeError(f"Nem sikerült betölteni a sablont.")

    async def send_verification_code(self, recipient_email: str, code: str) -> None:
        # Hivatalosabb tárgy mező
        subject = "Sapi3D - Regisztráció megerősítése"
        
        html_body = self._get_html_content(
            "email_verification.html",
            code=code,
            expires_in=settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_MINUTES
        )

        plain_body = f"Üdvözöljük a Sapi3D felületén! Az Ön ellenőrző kódja: {code}"

        await asyncio.to_thread(
            self._send_email_sync,
            recipient_email,
            subject,
            plain_body,
            html_body,
        )

    def _send_email_sync(self, recipient_email, subject, plain_body, html_body):
        if not all([settings.SMTP_HOST, settings.SMTP_USER, settings.SMTP_PASSWORD, settings.MAIL_FROM]):
            raise RuntimeError("Hiányzó SMTP beállítások!")

        message = EmailMessage()
        message["From"] = settings.MAIL_FROM
        message["To"] = recipient_email
        message["Subject"] = subject
        message.set_content(plain_body)
        message.add_alternative(html_body, subtype="html")

        try:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
                if settings.SMTP_PORT == 587:
                    smtp.starttls()
                smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                smtp.send_message(message)
        except Exception as exc:
            logger.error(f"Email hiba: {exc}")
            raise RuntimeError("Email küldés sikertelen.")