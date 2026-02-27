# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

# Real-Time AI Intrusion Detection System

## Overview
A real-time AI-powered intrusion detection dashboard built using:

- FastAPI (Backend)
- WebSocket Streaming
- React + Recharts (Frontend)
- Isolation Forest (Anomaly Detection)
- Multi-class Attack Classification
- SQLite Logging System

## Features
- Real-time attack simulation
- WebSocket live streaming
- Severity classification
- Risk spike detection
- DDoS burst detection
- Attack distribution analytics
- Export logs functionality

## Tech Stack
Python, FastAPI, Scikit-learn, React, Recharts, SQLite

## Architecture
Backend → ML Models → Database → WebSocket → Frontend Dashboard

## 🏗 Architecture

<img src="assets/architecture.png" width="700"/>