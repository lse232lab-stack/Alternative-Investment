# Alternative Investment Underwriting Copilot

Public-source alternative investment underwriting and financial-modeling project.

This project is designed as a portfolio-grade learning tool for alternative investment and real asset advisory roles. It does not ask an LLM to "make a model." Core calculations are deterministic Python functions. AI tools are used only as coding, structuring, and memo-support assistants.

## Project Goal

The goal is to compare how different alternative asset classes require different underwriting logic:

- Real estate assets are driven by rent, occupancy, opex, capex, leverage, and exit cap assumptions.
- Infrastructure assets are driven by production/usage volume, contracts, concession or PPA life, O&M, and debt service coverage.
- Private credit is driven by coupon, default, recovery, seniority, covenants, and portfolio diversification.
- Private equity is driven by EBITDA growth, leverage, deleveraging, and exit multiple.
- Fund secondaries are driven by NAV discount, NAV growth, distributions, unfunded commitments, and liquidity.

The most important design principle is evidence discipline: each case separates public/confirmed information from modeled assumptions.

## Current Asset-Class Coverage

Detailed engines:

- Office acquisition underwriting
- Renewable power infrastructure underwriting
- Logistics warehouse underwriting
- Data center underwriting
- Private credit / direct lending portfolio underwriting
- Private equity buyout / LBO underwriting

Template engines:

- Multifamily / Residential Rental
- Hotel / Hospitality
- Toll Road / Transportation PPP
- Secondaries / Fund NAV

Each detailed model or template includes:

- Public research case route
- Key underwriting question
- Core value drivers
- Confirmed/public examples
- Modeled estimate examples
- Required diligence checklist
- Simplified cash-flow model and memo draft

## What The App Does

- Select an alternative asset class
- Review the model design framework for that asset class
- Load a public-source office research case
- Calculate NOI, debt service, DSCR, IRR, equity multiple, NPV, and sensitivity outputs for office deals
- Model renewable power project cash flow using production, PPA, merchant, O&M, debt, and terminal value assumptions
- Run simplified models for additional alternative asset classes
- Generate memo drafts and public-source diligence questions
- Export the office model to Excel

## Project Structure

```text
app.py
demo.py
requirements.txt

src/underwriting_copilot/
  alternative_models.py   Asset-class catalog and generic template engines
  asset_router.py         Model selection and positioning logic
  models.py               Office input and output structures
  engine.py               Office underwriting calculation engine
  infra_models.py         Renewable infrastructure model
  sensitivity.py          Office sensitivity and reverse underwriting
  risk.py                 Office risk scanner
  source_tracker.py       Confirmed vs estimated input tracking
  excel_export.py         Formula-linked Excel export
  memo.py                 Korean office memo generator
  institution_lens.py     Institution-specific interpretation views
  sample_deals.py         Public-source office research case

docs/
  alternative_asset_class_roadmap_kr.md
  asset_class_model_design_kr.md
  public_deal_research_workflow_kr.md
  user_manual_kr.md
  portfolio_explanation_kr.md
  recruiter_positioning_kr.md

tests/
  test_engine.py
  test_alternative_models.py
```

## Run The App

```bash
python3 -m pip install -r requirements.txt
python3 -m streamlit run app.py --server.port 8501
```

Then open:

```text
http://localhost:8501
```

## Run Tests

```bash
python3 -m unittest discover -s tests
```

## Portfolio Positioning

For the Korean asset-class expansion roadmap, see:

```text
docs/alternative_asset_class_roadmap_kr.md
```

This project should be described as:

> A public-source alternative investment underwriting copilot that compares asset-class-specific cash-flow drivers, separates confirmed information from modeled assumptions, and generates simplified underwriting outputs for real estate, infrastructure, private credit, private equity, and fund secondary cases.

Do not describe this as a production investment model. It is a learning and portfolio project that shows:

- Understanding of alternative asset-class differences
- Deterministic financial-modeling logic
- Public-source research discipline
- Sensitivity and assumption-checking mindset
- Ability to use AI tools as a workflow assistant rather than as a black-box calculator

## Disclaimer

The included public research cases and model assumptions are for educational use only. They do not reproduce private deal models or represent investment advice. Replace modeled estimates with verified source data before using the framework for any real analysis.
