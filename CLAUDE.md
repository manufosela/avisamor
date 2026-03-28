# Avisamor - Project Guidelines

## Descripción
App de alertas para personas dependientes en el hogar. Una persona dependiente pulsa un botón (Flic 2 BLE o PWA) y todos los cuidadores reciben alerta con sonido/vibración/flash en su Android.

## Arquitectura
- **Monorepo**: /functions (Cloud Functions TS), /pwa (Astro+Lit), /android (Kotlin/Compose)
- **Backend**: Firebase Cloud Functions v2 + Firestore + FCM
- **Proyecto Firebase**: `avisador-avisamor` (europe-west1)
- **Web App ID**: `1:719215660005:web:1079f69f3f2445c73afd0c`
- **Android App ID**: `1:719215660005:android:2bff6f2cc6d5f5f43afd0c`
- **Package Android**: `com.manufosela.avisamor`

## GitHub SSH Config
Este repo pertenece a la cuenta personal `manufosela`.
- El remote DEBE usar `github.com-manufosela` (no `github.com` a secas)
- Si un push falla por permisos, verificar que el remote usa: `git@github.com-manufosela:manufosela/avisamor.git`
- Si `gh auth status` muestra que la cuenta activa NO es `manufosela`, ejecutar: `gh auth switch --user manufosela`

## Firebase
- Proyecto: `avisador-avisamor`
- Cuenta Firebase: `mjfosela@gmail.com`
- Plan Blaze, región europe-west1
- Auth: Anonymous Auth + grupo código 6 dígitos
- Si firebase CLI usa cuenta equivocada: `firebase use --add` o seleccionar `mjfosela@gmail.com`

## Reglas de negocio
- Alerta expira en 1 minuto si nadie responde
- Debounce 30s entre pulsaciones
- Primer receptor que acepta para la alerta; varios pueden aceptar
- 112 opcional configurable (futuro)
- Historial para estadísticas
