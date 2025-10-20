# Project Brief - MessageAI

## Project Overview

MessageAI is a production-quality, cross-platform messaging app (WhatsApp-style) with reliable real-time chat and offline support, enhanced with AI features including summaries, translation, smart replies, and action items using LLMs + lightweight RAG.

## Core Goals

- **Primary Goal**: Ship a complete messaging app within a one-week sprint
- **Technical Goal**: Reliable real-time chat with offline support
- **AI Goal**: Layer in intelligent features using LLMs and RAG

## Project Scope

**Timeline**: 7 days sprint

- **MVP (Day 1-2)**: 1:1 chats, basic groups, real-time delivery, persistence
- **Early Submission (Day 4)**: Typing indicators, image messaging, AI chat
- **Final (Day 7)**: Translation, smart replies, action items, RAG

## Success Criteria

- **MVP**: All core chat functions across devices, no message loss
- **Final**: AI functional, stable, cost-safe
- **Performance**: <100ms optimistic send; <1s server ack
- **Reliability**: No message loss; idempotent sends

## Non-Goals (v1)

- End-to-end encryption (E2EE) protocol design
- Voice/video calls
- Message reactions/threads/quoted replies beyond plain quoting
- Desktop/web clients

## Target Users

- **Primary**: Busy professional coordinating across multiple group chats who needs reliability + assistive AI
- **Secondary**: Friends/family groups sharing photos, needing seamless offline/poor-network performance

## Key Constraints

- **Performance**: <100ms optimistic send; <1s server ack
- **Reliability**: No message loss; idempotent sends
- **Security**: Firebase Rules, PII-scope, opt-in AI
- **Cost**: Capped LLM tokens, optimized Firestore
