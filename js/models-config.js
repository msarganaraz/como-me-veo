// Cada modelo puede especificar:
//  - body: nombre (o substring) del material de carrocería a colorear
//  - glass: lista de nombres de materiales de vidrio a hacer transparentes
//  - face: override de posición de la cara (si el modelo lo necesita)
// Si no se especifican body/glass, se usa la heurística por defecto.
export const MODELS = [
  {
    id: 'amarok',
    label: 'Amarok',
    glb: 'modelos/2017_volkswagen_amarok_v6.glb',
    body: 'phong5',
    glass: ['glass', 'ext_glass'],
    baseRotation: Math.PI / 2,
    face: { x: 0.2, y: 0.15, z: 0.14, width: 0.33, height: 0.4, rotY: 0 },
    colors: [
      { label: 'Azul', hex: '#1a5fa8' },
      { label: 'Gris', hex: '#8d9398' },
      { label: 'Blanco', hex: '#ecf0f1' },
      { label: 'Negro', hex: '#1a1a1a' },
      { label: 'Rojo', hex: '#b03030' }
    ]
  },
  {
    id: 'ferrari',
    label: 'Ferrari',
    glb: 'modelos/ferrari.glb',
    baseRotation: Math.PI,
    face: { x: -0.10, y: 0.13, z: -0.25, width: 0.42, height: 0.5, rotY: 0 },
    colors: [
      { label: 'Rojo', hex: '#c0392b' },
      { label: 'Negro', hex: '#1a1a1a' },
      { label: 'Azul', hex: '#1a3a8f' },
      { label: 'Amarillo', hex: '#f1c40f' },
      { label: 'Blanco', hex: '#ecf0f1' }
    ]
  }
];
