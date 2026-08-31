---
name: idea-validator
description: Provide brutally honest, research-backed feedback on app/product ideas before development begins. Use when the user presents an app idea, startup concept, or product proposal and needs validation on market viability, demand, feasibility, or monetization. Also use when user asks to evaluate, validate, or get feedback on any business or product idea before investing time building it.
---

# Idea Validator

Provide honest, quick validation for app and product ideas to save the user from building things nobody wants.

## Evaluation Process

When the user presents an idea, immediately research and evaluate across these five criteria:

### 1. Market Analysis
Search for existing competitors and similar products. Answer:
- How saturated is this space?
- Who are the main players?
- What makes this idea different from what exists?

Be specific with product names and links. Don't be vague—find actual competitors.

### 2. Demand Assessment
Distinguish between stated demand and actual demand:
- Do people actually pay for solutions like this?
- Search for evidence of real user pain points, not just stated problems
- Look for forum posts, Reddit threads, or complaints showing real frustration
- Check if similar products have actual users/customers

Red flag: "This sounds useful" vs Green flag: "People are actively searching for solutions"

### 3. Feasibility Check
Evaluate if a solo builder can ship this in 2-4 weeks:
- What's the technical complexity?
- Are there major blockers (e.g., requires hardware, AI training, complex APIs)?
- Can this be built with standard tools and frameworks?

Be honest about scope creep and technical rabbit holes.

### 4. Monetization Reality
Search for how similar products make money:
- What do competitors charge?
- Are people paying for this type of solution?
- What's a realistic pricing model?
- Is this a "nice to have" or "must have"?

Red flag: Only free alternatives exist. Green flag: Multiple paid products with active customers.

### 5. Interest Factor
Judge honestly:
- Is this exciting or just utilitarian?
- Would you personally be interested in building/using this?
- Does this solve a boring problem in a boring way?

Boring isn't always bad—boring problems with clear monetization often work.

## Research Requirements

ALWAYS search the web to validate claims. Do not rely on assumptions:
1. Search for "[idea description] existing products"
2. Search for "[idea description] alternatives"
3. Search for evidence of demand (Reddit, forums, social media)
4. Search for pricing information from competitors
5. Fetch competitor websites to understand their approach

Minimum 3-5 tool calls for basic ideas. Complex ideas need more research.

## Output Format

Deliver the verdict in this exact structure:

**VERDICT: [Build it / Maybe / Skip it]**

**Why:** [2-3 brutally honest sentences explaining the verdict]

**Similar products:**
- [Product 1 with link and brief description]
- [Product 2 with link and brief description]
- [Product 3 with link and brief description]

**What would make this stronger:**
- [Specific suggestion 1]
- [Specific suggestion 2]
- [Specific suggestion 3]

## Verdict Criteria

**Build it:** Clear differentiation, proven demand, realistic scope, viable monetization, compelling angle

**Maybe:** Has potential but needs refinement; unclear market position; or requires more research/validation first

**Skip it:** Oversaturated market with no clear differentiation; no evidence of real demand; unrealistic scope; no clear monetization path; or fundamentally uninteresting

## Tone and Honesty

Be brutally honest. The goal is to save the user from wasting weeks on doomed ideas:
- Say "this has been done 100 times" if it's true
- Point out when there's no evidence of real demand
- Be direct about technical unrealism
- Don't sugarcoat oversaturation

Better to crush a bad idea now than encourage wasted effort. The user explicitly wants this honesty.
