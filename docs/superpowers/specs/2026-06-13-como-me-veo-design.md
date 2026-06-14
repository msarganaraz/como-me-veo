# "¿Cómo me veo?" — Diseño del simulador AR de autos

**Fecha:** 2026-06-13  
**Proyecto:** `C:\Claude\Auto`  
**Cliente objetivo:** Concesionarios de autos en Argentina

---

## Resumen

Experiencia de realidad aumentada para celular donde el usuario escanea un QR, activa la cámara frontal y se ve reflejado dentro (ventanilla del conductor) de un auto 3D que rota en tiempo real con el movimiento de su cabeza. Permite elegir modelo y color. Diseñada como herramienta de marketing para concesionarios — campaña "¿Cómo me veo?".

---

## Experiencia de usuario

1. Cliente escanea QR en el concesionario (o recibe link por WhatsApp)
2. Abre la web en el browser del celular (sin app que descargar)
3. El browser pide permiso de cámara frontal → acepta
4. Ve inmediatamente la cámara activa con el auto 3D superpuesto
5. Su cara aparece recortada y compuesta en la ventanilla del conductor
6. Mueve la cabeza izquierda → el auto rota para mostrar su lateral derecho (el usuario "mira hacia el frente del auto")
7. Mueve la cabeza derecha → rota para mostrar su lateral izquierdo (el usuario "mira hacia la parte trasera")
8. Panel inferior: chips horizontales para cambiar modelo, puntos de colores para cambiar color
9. Sin pantalla de inicio ni botones de "empezar" — la experiencia es inmediata

---

## Arquitectura

### Stack tecnológico (100% gratuito, corre en browser)

| Componente | Tecnología | Rol |
|---|---|---|
| Detección facial | MediaPipe Face Mesh (Google) | 468 landmarks 3D, calcula yaw (ángulo horizontal de la cabeza) |
| Segmentación | MediaPipe Selfie Segmentation | Recorta la silueta de la persona del fondo |
| Render 3D | Three.js | Carga modelos GLB, aplica rotación, render WebGL |
| Composición | Canvas 2D / WebGL | Combina: cámara + silueta persona + auto 3D |
| Hosting | GitHub Pages | Gratis, HTTPS (requerido para cámara) |

### Flujo de datos

```
Cámara frontal
    ↓
MediaPipe Face Mesh → yaw angle → rotación del auto (Three.js)
MediaPipe Selfie Segmentation → máscara de persona → composición en ventanilla
    ↓
Canvas: fondo neutro + auto 3D rotado + cara recortada en ventanilla
```

---

## Layout — Mobile (full screen)

```
┌─────────────────────┐
│                     │
│   [auto 3D rotando] │  ← Three.js canvas, full screen
│      [cara]         │  ← cara del usuario en ventanilla del conductor
│                     │
│  ← mové la cabeza → │  ← hint sutil, desaparece después de 3s
│                     │
├─────────────────────┤
│ Marok  Taos  T-Cross│  ← chips horizontales (scroll si hay más)
│ ● ● ● ●             │  ← puntos de color del modelo seleccionado
└─────────────────────┘
```

---

## Modelos 3D

- Formato: `.glb` (GLTF Binary)
- Ubicación: `modelos/` en el proyecto
- Fuente inicial: Sketchfab (modelos gratuitos con licencia CC)
- Un modelo de prueba para la v1, luego se agregan más
- Colores: materiales intercambiables en el mismo modelo (`MeshStandardMaterial` de Three.js)

### Fallback para composición facial
Si MediaPipe Selfie Segmentation resulta demasiado lento en mobile (< 20fps), se usa una máscara oval fija centrada en la cara detectada por Face Mesh. Menos preciso pero garantiza fluidez.

### Colores iniciales por modelo
- Negro
- Rojo
- Azul
- Blanco/Plata

---

## Composición cara en ventanilla

1. MediaPipe detecta landmarks de ojos, nariz, boca
2. Se calcula el bounding box de la cara
3. Se recorta la región de la cara del video frame (usando máscara de segmentación)
4. El modelo 3D tiene un punto de referencia (empty/bone) que marca la posición de la ventanilla del conductor en cada ángulo
5. La cara recortada se escala y posiciona en ese punto del canvas

---

## Estructura de archivos

```
C:\Claude\Auto\
├── index.html          ← app principal
├── js/
│   ├── face-tracker.js ← MediaPipe Face Mesh + Selfie Segmentation
│   ├── car-renderer.js ← Three.js: carga GLB, rotación, materiales
│   └── compositor.js   ← combina cámara + auto + cara
├── modelos/
│   └── marok.glb       ← modelo de prueba (v1)
├── css/
│   └── style.css
└── docs/
    └── superpowers/specs/
        └── 2026-06-13-como-me-veo-design.md
```

---

## Deployment

- Repositorio público en GitHub: `msarganaraz/como-me-veo` (o similar)
- GitHub Pages habilitado desde `main`
- URL para QR: `https://msarganaraz.github.io/como-me-veo/`
- HTTPS incluido (requerido para acceso a cámara en mobile)

---

## Restricciones y supuestos

- Solo funciona con cámara frontal (selfie camera)
- Requiere browser moderno (Chrome/Safari en iOS/Android — últimas 2 versiones)
- El modelo 3D del auto debe tener la ventanilla del conductor claramente definida
- V1 arranca con 1 modelo de auto; colores y modelos adicionales se agregan en v2
- No hay backend, no hay base de datos, no hay login

---

## Fuera de alcance (v1)

- Vista interior del auto
- Compartir foto/video en redes
- Panel de administración para que el concesionario cargue sus propios autos
- Analytics de uso
