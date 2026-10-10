# Documentation Validation Quickstart

Run from the repository root after the documentation tasks are implemented.

## 1. Check the expected deliverables and key link targets

```bash
python -c "from pathlib import Path; paths=['.specify/memory/constitution.md','AGENTS.md','README.md','docs/development/architecture.md','docs/development/java.md','docs/development/frontend.md','CONTEXT.md','api-contract/src/main/openapi/justvotes-v1.yaml','.github/workflows/ci.yml']; missing=[p for p in paths if not Path(p).is_file()]; assert not missing, f'Missing documentation targets: {missing}'; print(f'All {len(paths)} expected targets exist')"
```

Manually inspect the relative Markdown links in the Constitution and `AGENTS.md` and
confirm each resolves from its containing file. Confirm the guide-to-module links are
correct. Confirm no `docs/development` links are broken.

## 2. Review content ownership and scope

- Compare the final Constitution, three development guides, README, and AGENTS.md against
  `data-model.md` and `contracts/documentation-sources.md`.
- Confirm every moved rule retains its prior MUST/SHOULD strength.
- Confirm the README still owns runnable build/test instructions and no mandatory CI
  category has disappeared.
- Confirm the Constitution retains Governance, semantic-versioning rules, and Version,
  Ratified, and Last Amended metadata. Do not replace the unknown ratification TODO with an
  inferred date.
- Confirm the application API contract, generated sources, application tests, and
  runtime code were not changed by this documentation feature.

## 3. Run repository checks

Use the exact prerequisites and commands documented in `README.md` and the job definitions
in `.github/workflows/ci.yml`. The established local backend check is run from the repository
root; frontend checks are run from `frontend/`; generated contract-client validation is run
from `api-contract/typescript-contract/`. CI additionally covers the browser matrix and
container build/runtime smoke checks.

Record each command and its real result. A blocked or unrun mandatory gate is not a pass.
Do not change unrelated in-progress work to make these checks pass.

## Expected outcome

All expected documentation targets exist, links and ownership rules are consistent, the
Constitution's governance and metadata are valid, and applicable repository checks complete
without changing application behavior.
