# Application Entities Hierarchy

This document contains general definitions used in the application. Entities are sorted by importance in the hierarchy, from the most significant to the least significant. Each entity can include multiple lower-ranked entities.

## Index
**Index** — a catalog in the database, representing the most important entity in the application hierarchy.

**Example:** A database of product categories in an e-commerce platform, serving as the main organizational structure.

## Operation
**Operation** — a group of events consolidated into a logical structure. It is similar to a section in a library or a volume on a disk.

**Example:** A transaction log that records all updates to an account within a specific period.

## Context
**Context** — groups used to organize [plugins](#plugins) and [files](#file). It is akin to folders on a desktop.

**Example:** A "Project A" context containing related plugins for parsing and analyzing project-specific files.

## Plugins
**Plugins** — a set of configurations for decoding, interpreting, and processing uploaded [files](#file). Plugins are divided into three subtypes:

1. **Open-source community** — plugins developed by our community.
   - **Example:** A free text parser plugin contributed by developers.
2. **Paid** — licensed plugins distributed individually. Created and maintained exclusively by [Mentat](https://mentat.is/).
   - **Example:** A proprietary video analysis plugin available for purchase.
3. **Built-in** — plugins included in the base version of the application.
   - **Example:** A built-in JSON parser for default data processing.

## File
**File** — a collection of events. Contains [events](#event) and [triggers](#event) in chronological order. Used in the [Ingestion](./ingestion) process.

**Example:** A server log file containing timestamped entries of user actions and system responses in [evtx](https://github.com/libyal/libevtx/blob/main/documentation/Windows%20XML%20Event%20Log%20(EVTX).asciidoc) or [csv](https://en.wikipedia.org/wiki/Comma-separated_values) format.

## Event
**Event** (also called Document) — the smallest resolvable data unit. In real-world terms, it can be represented as an A4 sheet documenting events at a specific point in time, including parameters, memory addresses, and other automatically collected information.

**Example:** A system-generated report recording the PORT usage and memory allocation during a specific trigger.
