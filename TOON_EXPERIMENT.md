# TOON vs JSON

### _A Real World, No Hype Benchmark on Token Efficiency for LLM Applications_

This repo contains an experiment comparing **TOON (Token-Oriented Object Notation)** against **JSON** in an LLM task-scheduling assistant built using gpt-4o-mini.

The question was simple:

> **Would TOON reduce token usage (and thus cost) enough to justify switching from JSON?**

No enterprise funded compute clusters.
No 10000-run statistical regressions.
Just one human+self, curiosity, and an ear-ache. _(0/10 — would not recommend as a productivity hack.)_

The experiment emerged from building a tiny follow up reminder AI that writes to my or even your Google Calendar. Somewhere between ~~painkillers~~ antibiotics and suffering from being severly-online, I came across TOON. TOON is a compact serialization format claiming ~40% token savings.

Thought to myself:

> “Hell yeah, let’s make this thing more efficient.”
> Spoiler: **The answer was more nuanced than that.**

As a sage I know always says, **"The answer to everything is, it depends"**

---

## Before we dive into results — important context

The great people/maintainers of TOON are very upfront about when it should _not_ be used.
Directly from the official documentation:

### **TOON is _not ideal_ for:**

- Structurally complex payloads
- Highly nested or heterogeneous data
- Formats where readability & debugging matter more than bytes

This aligns almost perfectly with what my experiment showed. Yes, I was bored, in pain and this was a a good idea thought me.

On the other hand —

### **TOON _can_ outperform JSON when:**

- Data is **uniform, tabular, repetitive**
- You are transferring **lists of similar objects**
- The goal is **minimal overhead, maximum compression**

And in _one_ of my tests — TOON crushed it.

So this README is not _TOON bad, JSON good_.
It’s:

### **Use JSON by default, TOON when the shape of your data earns it.**

# 📊 TOON vs JSON Token Efficiency Benchmark

## 1) Single Task Comparison

<pre style="white-space:pre; overflow-x:auto;">
╔══════════════════════════════════════════════════════════════════╗
║  Single Task — JSON vs TOON                                      ║
╚══════════════════════════════════════════════════════════════════╝

JSON Format:
SCHEDULE_TASK:{"title":"Test Number One","description":"Thing number one, which is a test\nThing number two...","priority":"medium","estimatedDuration":60,"preferredStartDate":"2025-12-05T17:00:00Z"}
Token estimate: 90

TOON Format:
SCHEDULE_TASK:
title: Test Number One
description: "... same text ..."
priority: medium
estimatedDuration: 60
preferredStartDate: "2025-12-05T17:00:00Z"
Token estimate: 88

Savings: 2 tokens (2.2%)

Round-trip TOON encode → decode → encode = ✔ matches
</pre>

---

## 2) Three-task Batch (TOON shines)

<pre style="white-space:pre; overflow-x:auto;">
╔══════════════════════════════════════════════════════════════════╗
║  Multi-task batch (3 items)                                      ║
╚══════════════════════════════════════════════════════════════════╝

JSON Tasks: 115 tokens  
TOON Tasks: 72 tokens

Savings: 43 tokens (37.4%)
NOTE: This is where TOON is most effective — small, uniform structures.
</pre>

---

## 3) 20-task Complex Dataset

<pre style="white-space:pre; overflow-x:auto;">
╔══════════════════════════════════════════════════════════════════╗
║  Large dataset (20 structured tasks)                            ║
╚══════════════════════════════════════════════════════════════════╝

JSON: 2449 tokens  
TOON: 2510 tokens

❌ JSON is more compact here (TOON +2.5%)
</pre>

---

## 4) Deeply Nested Structure

<pre style="white-space:pre; overflow-x:auto;">
╔══════════════════════════════════════════════════════════════════╗
║  Nested object comparison                                        ║
╚══════════════════════════════════════════════════════════════════╝

JSON: 328 tokens  
TOON: 324 tokens

≈ Negligible difference
</pre>

---

## 5) Repeated Structure Test (50 items)

<pre style="white-space:pre; overflow-x:auto;">
╔══════════════════════════════════════════════════════════════════╗
║  50 record repeated-structure test                               ║
╚══════════════════════════════════════════════════════════════════╝

JSON: 4099 tokens  
TOON: 4888 tokens

❌ JSON is ~19% more efficient in large repeated data
</pre>

---

## 6) Real LLM Output Token Usage

<pre style="white-space:pre; overflow-x:auto;">
╔══════════════════════════════════════════════════════════════════╗
║  LLM-formatting test (OpenAI GPT-4o-mini)                        ║
╚══════════════════════════════════════════════════════════════════╝

JSON Response → 146 tokens  
TOON Response → 155 tokens

❌ JSON cheaper for real LLM generation (-6.2%)
</pre>

---

### Final Summary

<pre style="white-space:pre; overflow-x:auto;">
TOON wins only in small uniform task batches (≈ 37% savings)

JSON wins for:
  • Larger datasets
  • Mixed or nested structures
  • LLM output formatting
  • Real cost efficiency

Conclusion: JSON remains default; TOON is a niche optimization tool.
</pre>

---

__For TOON, start here:__
[When Not to Use TOON](https://github.com/toon-format/toon?tab=readme-ov-file#when-not-to-use-toon)

