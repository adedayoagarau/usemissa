# Missa Domain Context

Missa connects opportunity discovery with the complete submission lifecycle for individuals and organizations. This vocabulary keeps product, architecture, and persistence work aligned.

## Language

**Organization**:
The legal or operational account that publishes opportunities, receives submissions, and owns teams and programs.
_Avoid_: Enterprise account, workspace

**Team**:
An organization-owned subdivision such as a department, imprint, or chapter. The internal schema name remains `Entity`.
_Avoid_: Entity in user-facing language

**Program**:
An initiative owned by a team that groups opportunities and their submission workflows.
_Avoid_: Inner workspace

**Opportunity**:
A call, grant, award, residency, fellowship, contest, or other opening that can be discovered or published.
_Avoid_: Opportunity card, open call in application navigation

**Opportunity Cycle**:
A dated or recurring intake period for an Opportunity. Closing a cycle records that intake as closed without implying that the Opportunity itself has been discontinued.
_Avoid_: Treating every passed deadline as permanent closure

**Opportunity Season**:
The source-evidenced recurrence period associated with an Opportunity Cycle, such as Spring, Summer, Autumn, Winter, annual, or another explicitly named period. A season may schedule renewed ingestion, but it never proves that a new cycle is open.
_Avoid_: Inferring a season from an unsupported date pattern

**Opportunity Availability**:
The evidence-backed current intake state and its timing basis: forecasted, opening soon, open on a fixed deadline, rolling, year-round, until filled, seasonally closed, closed, archived, or uncertain. A scheduled recheck returns an Opportunity to ingestion; only fresh source evidence can reopen it publicly.
_Avoid_: Deriving public availability from a label without current source evidence

**Source**:
A monitored website, feed, directory, partner endpoint, or user-suggested URL from which Missa discovers and verifies Opportunities.
_Avoid_: Scrape target

**Source Freshness**:
The evidence that distinguishes when a Source was attempted, successfully fetched, and successfully processed into Opportunity information.
_Avoid_: A single ambiguous last checked timestamp

**Submission**:
The package sent through an opportunity's form, containing one or more Works.
_Avoid_: Submission package

**Work**:
An individual creative or professional item inside a Submission that can receive its own decision and delivery workflow.
_Avoid_: Submission item

**Organization Access**:
The relationship between an authenticated account, its organization role, and the organization-owned resource it may act on.
_Avoid_: Membership-only authorization
