<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 💰 Finanzas Personales AI

Aplicación web progresiva (PWA) para la gestión de finanzas personales, potenciada por Inteligencia Artificial (Google Gemini). Permite registrar gastos, ingresos, inversiones y ahorros mediante voz o texto, con conversión automática de monedas (ARS/USD) utilizando la cotización del Dólar MEP en tiempo real.

## ✨ Características Principales

*   **🎙️ Ingreso por Voz con IA:** Dicta tus gastos (ej: "Gasté 15000 en el súper") y la IA extraerá el concepto, monto, categoría y sentimiento automáticamente.
*   **💱 Conversión Automática:** Todos los ingresos en Pesos Argentinos (ARS) se convierten a Dólares (USD) usando la cotización MEP del día.
*   **📈 Inversiones:** Seguimiento de portafolio dividido en:
    *   **Tradicional:** Acciones, Bonos, CEDEARs.
    *   **Cripto:** Cotización en tiempo real de BTC, ETH, SOL, AVAX.
*   **🐖 Ahorros:** Registro histórico de ahorros en USD.
*   **📊 Dashboard:** Resumen visual de patrimonio neto, flujo de caja mensual y distribución de gastos.
*   **💾 Base de Datos Local:** Sistema de Backup y Restauración (JSON) y exportación a Excel (CSV).
*   **📱 Diseño Responsivo:** Funciona como una App nativa en móviles (Android/iOS) y escritorio.

## 🚀 Tecnologías

*   **Frontend:** React 18, Vite, TypeScript.
*   **Estilos:** Tailwind CSS.
*   **IA:** Google Gemini API (`@google/genai`).
*   **Gráficos:** Recharts.

## 🛠️ Instalación y Uso Local

1.  Clonar el repositorio:
    ```bash
    git clone https://github.com/TU_USUARIO/finanzas-ai.git
    ```
2.  Instalar dependencias:
    ```bash
    cd finanzas-ai
    npm install
    ```
3.  Configurar API Key:
    *   Crea un archivo `.env` en la raíz.
    *   Agrega: `API_KEY=tu_clave_de_google_gemini`
4.  Iniciar servidor de desarrollo:
    ```bash
    npm run dev
    ```

## 🌐 Despliegue (Cómo ponerla online)

La forma más fácil es usar **Vercel**:

1.  Sube este código a tu GitHub.
2.  Crea una cuenta en [Vercel](https://vercel.com).
3.  Importa tu repositorio de GitHub.
4.  En "Environment Variables", agrega una llamada `API_KEY` con tu clave de Gemini.
5.  Haz clic en **Deploy**.

## 🔒 Privacidad y Datos

Esta aplicación funciona bajo una arquitectura **Local-First**.
*   Los datos se guardan en el `localStorage` de tu navegador.
*   **No** hay una base de datos en la nube centralizada.
*   Para sincronizar entre dispositivos (Notebook <-> Celular), utiliza el botón **Base de Datos > Descargar Backup** y **Restaurar Backup**.

---
Desarrollado con ❤️ para gestión financiera personal.
