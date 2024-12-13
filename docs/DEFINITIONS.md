# Application Jargon & Terminology
This document contains general definitions used in the application.

## Index
The elastic **index** used to store documents. In the context of gULP, documents should be refferred to as [events](#event).

## Operation
An **operation** is a group of log sources from different [contexes](#context) for a given incident.
It can be thought of as a "Project".

> **Example:** Upon starting an investigation a new Operation is created to handle the incident.

## Context
By **context** we mean a logical container of all data from a given [source](#source) (e.g. all relevant logs from a given hostname).

> **Example:** A "webserver_01" context could contain, for example, the apache access logs and the linux system logs from a specific webserver.

## Source
Any file containing a collection of logs/events is called a **source**.
Sources contains [events](#event). Used in the [Ingestion](./ingestion.md) process.

> **Example:** Windows' system logs in the [evtx](https://github.com/libyal/libevtx/blob/main/documentation/Windows%20XML%20Event%20Log%20(EVTX).asciidoc) format.

## Event
An **event** is a single event for a given file format. In the context of elastic, an event is referred to as "document".

## Plugins
**Plugins** — gULP supports differnt kind of plugins.
  - **extension**: extend or override the gULP APIs
  - **query**: support ingestion from remote sources directly (e.g. Splunk)
  - **ingestion**: extend support for ingesting a specific [source](#source)'s file format (e.g. pcap, evtx, journald, etc)
  - **renderer**: a client-side plugin used to render data in a custom way.

Plugins can be either:
1. **Open-source** — free, open-source plugins developed by the community.
2. **Paid** — licensed plugins available to paid customers. Created and maintained exclusively by [Mentat](https://mentat.is/).
3. **Built-in** — plugins included in the base version of the application.
   - **Example:** The [pcap](https://github.com/mentat-is/gulp/blob/develop/src/gulp/plugins/ingestion/pcap.py) ingestion plugin is part of our built-in plugins.
