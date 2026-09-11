# Midjourney MCP: documentation and source review

User-supplied integration candidate, reviewed September 7, 2026. Not installed, authenticated or tested against the user's account.

## Source identity

The supplied README matches [Lala-0x3f/mj-mcp](https://github.com/Lala-0x3f/mj-mcp), published as [midjourney-mcp on PyPI](https://pypi.org/project/midjourney-mcp/). PyPI lists version 0.1.1, released April 23, 2025, requiring Python 3.10+. The similarly named WilliamJizh/midjourney-mcp-web is a different project; do not silently substitute it.

## Supplied setup

```json
{
  "mcpServers": {
    "midjourney": {
      "command": "uvx",
      "args": ["midjourney-mcp"]
    }
  }
}
```

The supplied documentation names TOKEN_R and TOKEN_I as required authentication values, API_BASE as optional, and SUFFIX as optional with a --v 6.1 default. Real credentials must remain outside the project and chat. This JSON describes an MCP client configuration; it is not evidence that a callable tool has been registered in this Codex session.

## Findings from implementation

Inspected [midjourney.py](https://github.com/Lala-0x3f/mj-mcp/blob/main/src/midjourney_mcp/midjourney.py), Git blob `5aa1d779ae135c995e6d01b6c407cd9a4ca62cd5`.

- The exposed tool accepts prompt and aspect ratio. There are no explicit reference-upload, masked-edit, video or endpoint-conditioning tools.
- Authentication uses Midjourney web cookies.
- Submission hardcodes fast mode and private=false.
- make_request passes api_base as the third positional argument to submit_job, whose third parameter is channelId.
- get_job_status prints its WebSocket URL, including the authentication token.
- Output URLs are constructed as 1024_N.webp assets; they are not verified original-resolution downloads.

These are static source findings, not a live compatibility test. The installed PyPI artifact has not been compared with the GitHub source.

## Decision for this production workflow

Do not make this untested server a prerequisite for the homepage. The selected original is already downloaded through the authorized Chrome workflow. Before adopting the MCP, compare the pinned distribution with source, repair credential logging and submission arguments, validate current service compatibility, configure credentials privately, and verify one bounded generation and its actual downloaded output. Do not claim installation or successful generation until those checks occur.

Continue writing the master-specific destination and motion briefs independently. This candidate's advertised tool does not by itself complete the required editing/video workflow.
