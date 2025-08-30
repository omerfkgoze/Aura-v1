# Introduction

Bu dokümanda Aura projesinin tam yığın mimarisini tanımlıyor. Aura, zero-knowledge mimarisi ile privacy-first menstrual cycle tracking sağlayan bir uygulamadır. Backend sistemler, frontend implementasyon, UX/UI tasarımı ve entegrasyonları kapsayan tek kaynak doküman olarak AI-driven fullstack geliştirme sürecini yönlendirmektedir.

Bu unified yaklaşım, geleneksel olarak ayrı backend, frontend ve UX mimari dokümanlarda sunulan bilgileri birleştirerek, modern fullstack uygulamalar için streamlined geliştirme süreci sağlar.

## UX Architecture Foundation

This document integrates comprehensive user experience goals, information architecture, user flows, and visual design specifications for Aura's privacy-first menstrual tracking interface. The UX architecture serves as the foundation for visual design and frontend development, ensuring a cohesive and culturally-sensitive user experience that prioritizes privacy and honest uncertainty communication.

## Starter Template or Existing Project

PRD'de belirtildiği üzere:

- **Monorepo Structure:** Nx/Turborepo + pnpm monorepo yapısı
- **Cryptographic Architecture:** Rust/WASM crypto core + libsodium
- **Backend:** Supabase managed PostgreSQL + Row Level Security
- **Frontend:** React Native (mobile) + Next.js (web)
- **Security Standards:** SLSA compliance, SBOM generation, Sigstore attestation

**Selected Approach:** Custom greenfield implementation with modern fullstack tools, zero-knowledge architecture constraints requiring specialized security implementation rather than generic starters.

## Change Log

| Date       | Version | Description                                     | Author            |
| ---------- | ------- | ----------------------------------------------- | ----------------- |
| 2025-08-28 | v1.0    | Initial Architecture from PRD + UX Architecture | Winston-Architect |
| 2025-08-28 | v1.1    | Integrated UX Architecture with Technical Architecture | BMad-Orchestrator |
