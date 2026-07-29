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

**Submission**:
The package sent through an opportunity's form, containing one or more Works.
_Avoid_: Submission package

**Work**:
An individual creative or professional item inside a Submission that can receive its own decision and delivery workflow.
_Avoid_: Submission item

**Organization Access**:
The relationship between an authenticated account, its organization role, and the organization-owned resource it may act on.
_Avoid_: Membership-only authorization
