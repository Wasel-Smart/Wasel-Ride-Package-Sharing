# Wasel Ride & Package Sharing

[![CI](https://img.shields.io/github/actions/workflow/status/Wasel-Smart/Wasel-Ride-Package-Sharing/ci.yml?branch=master&label=ci)](https://github.com/Wasel-Smart/Wasel-Ride-Package-Sharing/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3FCF8E?logo=supabase&logoColor=white)
![OpenAPI](https://img.shields.io/badge/OpenAPI-v1-6BA539?logo=openapiinitiative&logoColor=white)

Wasel is a Jordan-focused mobility and logistics platform supporting shared rides, package handoff delivery, corridor-based transport discovery, and operator workflows.

This repository contains a full-stack distributed system including web, mobile, backend services, shared domain contracts, and infrastructure.

---

## System Overview

Wasel is designed as an **event-driven, service-oriented architecture** with strict separation between client, services, and asynchronous workers.

### Core Design Principles
- Event-driven communication via Redis Streams
- Stateless and horizontally scalable services
- Clear domain boundaries (DDD-inspired structure)
- Contract-first service communication
- Infrastructure-as-code deployment model
- Observability built into every service

---

## Architecture

```mermaid
flowchart TB

  Web["Web Client (React)"]
  Mobile["Mobile Apps (React Native)"]

  Gateway["API Gateway / Edge Layer"]

  Ride["Ride Matching Service"]
  Package["Package Delivery Service"]
  Payment["Payment Service"]
  Trust["Trust & Operations Service"]

  EventBus["Redis Streams (Event Bus)"]

  MatchWorker["Matching Worker"]
  PayWorker["Payment Worker"]
  OpsWorker["Analytics Worker"]

  DB[(PostgreSQL + PostGIS)]
  Geo[(Redis GEO Cache)]

  Web --> Gateway
  Mobile --> Gateway

  Gateway --> Ride
  Gateway --> Package
  Gateway --> Payment
  Gateway --> Trust

  Ride --> EventBus
  Package --> EventBus
  Payment --> EventBus

  EventBus --> MatchWorker
  EventBus --> PayWorker
  EventBus --> OpsWorker

  MatchWorker --> DB
  MatchWorker --> Geo
  PayWorker --> DB
  OpsWorker --> DB