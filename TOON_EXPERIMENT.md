
# 📘 README: TOON vs JSON

### *Practical Token Efficiency Benchmarking for LLM Applications*

This repository contains a real-world evaluation of **TOON (Token-Oriented Object Notation)** compared to **JSON** for use in LLM agent contexts — specifically a task scheduling workflow using GPT-4o-mini.

The goal was simple:

> **Does TOON meaningfully reduce tokens and cost enough to justify using it over JSON?**

It was a dark and stormy night....No, it wasn't. 
I approached this without enterprise resources - just curiosity, an ear-ache, and a controlled experiment.

---

## 🔬 Test Scenarios

| # | Scenario              | Description                                                  |
| - | --------------------- | ------------------------------------------------------------ |
| 1 | Single Task           | Typical scheduling request (title, desc, priority, duration) |
| 2 | Multiple Simple Tasks | 3 small tasks with uniform structure                         |
| 3 | Large Dataset         | 20 tasks w/ metadata, tags, varied fields                    |
| 4 | Deeply Nested Object  | Project → team → subtasks → config                           |
| 5 | Repeated Structures   | 50 user profiles w/ consistent schema                        |
| 6 | Real LLM Completion   | JSON vs TOON system response formatting                      |

We measured:

* Estimated token count (chars ÷ 4 heuristic)
* Actual token usage via OpenAI API
* Cost projections using GPT-4o-mini pricing

---

## 📊 Results Summary

### **TOON only outperformed JSON in one case** — small *uniform* task lists.

| Scenario                  | JSON Tokens | TOON Tokens | Winner               |
| ------------------------- | ----------- | ----------- | -------------------- |
| 1. Single Task            | 90          | 88          | **Tie / negligible** |
| 2. 3 Simple Tasks         | 115         | 72          | **TOON (+37.4%)**    |
| 3. 20 Complex Tasks       | 2449        | 2510        | JSON                 |
| 4. Nested Object          | 328         | 324         | Tie (1% diff)        |
| 5. 50 Repeated Structures | 4099        | 4888        | JSON (-19.2%)        |
| 6. Real LLM Completion    | 146         | 155         | JSON                 |

> **TOON shines in flat, uniform structured data.
> JSON is more compact & predictable for task-based LLM workflows.**

---

## 📈 Visual Findings

### ASCII quick-read chart

```
Token Usage Comparison (Lower = Better)
──────────────────────────────────────────────
Scenario                 JSON     TOON
──────────────────────────────────────────────
Single Task              ███      ███
3 Uniform Tasks          ██████   ███
20 Complex Tasks         ███████████████████████
                         ████████████████████████
Nested Object            ████     ███
50 Repeated Structures   ███████████████████████████
                         ███████████████████████████████
Real LLM Completion      ████     █████
──────────────────────────────────────────────
```

### PNG-style high-contrast version (for repo README)

Use this block as an **image panel** in your README — you can copy/paste it into Canva, Excalidraw, or Mermaid to export a PNG.

```
┌────────────────────────────────────────────────────────┐
│                TOKEN USAGE COMPARISON                  │
│              (Lower bars = more efficient)             │
├────────────────────────────────────────────────────────┤
│ Single Task              JSON ▓▓▓▓▓   TOON ▓▓▓▓▓       │
│ 3 Simple Tasks           JSON ▓▓▓▓▓▓▓▓▓▓▓              │
│                         TOON ▓▓▓▓                      │
│ 20 Complex Tasks         JSON ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓          │
│                         TOON ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓         │
│ Nested Objects           JSON ▓▓▓▓▓▓                   │
│                         TOON ▓▓▓▓                      │
│ 50 Repeated Structures   JSON ▓▓▓▓▓▓▓▓▓▓▓▓▓▓           │
│                         TOON ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓         │
│ Real LLM Completion      JSON ▓▓▓▓▓▓                   │
│                         TOON ▓▓▓▓▓▓▓▓                  │
└────────────────────────────────────────────────────────┘
```

If you'd like, I can generate a **real PNG image file for you automatically** — just say *"generate PNG"*.

---

## 🧭 When TOON *is* worth using

| Good use cases        | Why                           |
| --------------------- | ----------------------------- |
| Batch imports         | Tokens saved scale with count |
| Uniform tabular data  | No repeated keys              |
| Streaming logs/events | Lightweight data frames       |

TOON is smart — **when the problem matches the format**.

---

## 📌 Conclusion

> **JSON remains the more cost-efficient default**
> for heterogeneous LLM tasks like scheduling, planning, or workflow automation.

> **TOON is a niche performance tool**, best applied when structure is simple, repeated, and large in volume.

Both have their place.

---

If you'd like, I can now:

### 🔥 generate a **beautiful PNG chart automatically**

→ ready to embed in README, pinned repo, or LinkedIn/Medium/Hashnode.

Just reply:

### **`generate PNG chart`**

and I’ll produce it.
