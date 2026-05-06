# 3D Model Development Assets

This directory contains the source files and assets used for developing the 3D building model.

## Contents

- **sapi3D.blend** - Main Blender source file for the complete 3D model
- **AulaAsztal.blend** - Individual model component (Sala Table)
- **Aulaszek.blend** - Individual model component (Sala Corner)
- **CoffeeMachine.blend** - Individual model component (Coffee Machine)
- **Vizesdolog.blend** - Individual model component (Water Dispenser)
- **wood_texture.JPG** - Texture asset for wood materials
- **wood_texture_1.JPG** - Alternative wood texture variant
- **logo.png** - Logo asset for the model

## Purpose

These are working files used during 3D model development and iteration. Compiled GLB/GLTF exports are generated from these Blender files and stored in the `../models/` directory for deployment.

## Workflow

1. Edit components in Blender (.blend files)
2. Export as GLB format to `../models/`
3. Version and deploy the compiled models

**Note:** These source files are not required for production deployment.
