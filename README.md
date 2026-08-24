# Finora — Motor financiero

Diagnóstico determinista de finanzas personales. El motor decide **qué hacer primero**
(Ordenar → Estabilizar → Crecer), proyecta la trayectoria de deuda y colchón mes a mes,
y se estresa contra los meses malos. **Todo el cálculo corre en el navegador: sin IA, sin
servidor, costo $0.**

## Correrlo en tu computadora

Necesitás Node.js 18+ instalado. Después:

```bash
npm install
npm run dev
```

Abrí http://localhost:3000

## Subirlo a Vercel (URL pública, gratis)

1. Creá un repositorio en GitHub y subí esta carpeta:
   ```bash
   git init
   git add .
   git commit -m "Finora — motor v1.2"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/finora.git
   git push -u origin main
   ```
2. Entrá a https://vercel.com, iniciá sesión con GitHub.
3. **Add New → Project → Import** el repo `finora`.
4. Vercel detecta Next.js solo. Dale **Deploy**. En ~1 minuto tenés tu URL pública.

Cada vez que hagas `git push`, Vercel redeploya solo.

> Nota de costo: el plan Hobby (gratis) es para proyectos personales/no comerciales.
> El día que lo monetices, se pasa a Pro ($20/mes por desarrollador, no por usuario).

## Estructura

```
finora/
├─ app/
│  ├─ layout.js        · layout raíz
│  ├─ page.js          · monta el motor
│  └─ globals.css      · reset mínimo
├─ components/
│  └─ MotorFinanzas.jsx · TODO el motor + la UI (funciones puras, estilos inline)
├─ package.json
└─ next.config.mjs
```

## Qué sigue (roadmap)

- **Onboarding**: reemplazar los datos precargados por las preguntas que llenan los inputs.
- **Persistencia**: guardar datos entre sesiones (Neon o Supabase, capa gratuita).
- **Login**: privado por usuario.
- **Alertas pre-gasto**: leer el disponible por partida y avisar antes de confirmar.

El motor (`components/MotorFinanzas.jsx`) es el activo: son funciones puras, fáciles de
testear y de mover. La interfaz y la persistencia se construyen alrededor de él.
