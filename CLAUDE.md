# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Giftpile is a self-hostable ("localhostable") wishlist application. This is an early-stage
greenfield project: as of now the repository contains only project scaffolding — there is no
application code, and no build system (Maven/Gradle) has been committed yet.

Intended platform: Java on JDK 25 (Temurin 25), configured as a plain IntelliJ Java module.
The `.gitignore` is Java-oriented (`.class`, `.jar`/`.war`, etc.). When adding a build system,
pick one deliberately (Maven `pom.xml` or Gradle) and update this file with build/test/run commands.

## Spec-driven workflow (OpenSpec)

This project uses OpenSpec for spec-driven development (`openspec/config.yaml`, `schema: spec-driven`).
Non-trivial changes are expected to flow through OpenSpec artifacts (proposal → design → specs →
tasks → implementation → archive) rather than being written ad hoc.

Use the OpenSpec skills / `/opsx` commands to drive this:
- `openspec-explore` (`/opsx:explore`) — think through an idea before committing to a change.
- `openspec-propose` (`/opsx:propose`) — create a change with all artifacts in one step.
- `openspec-apply-change` (`/opsx:apply`) — implement the tasks of a change.
- `openspec-sync-specs` (`/opsx:sync`) — sync delta specs into the main specs.
- `openspec-archive-change` (`/opsx:archive`) — finalize and archive a completed change.

Project-wide context and per-artifact rules for OpenSpec live in `openspec/config.yaml`
(currently empty templates — fill in the `context:` and `rules:` sections as conventions solidify).

## Git

Do not run `git add`, `git commit`, or `git push`. The user reviews all diffs and handles all
git operations manually.
