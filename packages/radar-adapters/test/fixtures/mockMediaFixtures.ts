export const OFFICIAL_CALL_JSON_LD_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>2026 International Poetry Fellowship - Call for Applications</title>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "https://poetryfoundation.example/fellowship-2026#webpage",
        "name": "2026 International Poetry Fellowship",
        "primaryImageOfPage": {
          "@type": "ImageObject",
          "url": "https://poetryfoundation.example/media/fellowship-hero-primary.jpg",
          "caption": "Fellowship Writing Retreat at Blue Mountain",
          "width": 1600,
          "height": 900
        }
      },
      {
        "@type": "Event",
        "name": "2026 International Poetry Fellowship",
        "image": {
          "@type": "ImageObject",
          "url": "https://poetryfoundation.example/media/fellowship-call-cover.jpg",
          "caption": "Cover illustration by Amina Ray © 2026",
          "width": 1200,
          "height": 800
        }
      },
      {
        "@type": "Organization",
        "name": "International Poetry Foundation",
        "logo": "https://poetryfoundation.example/media/org-logo-official.png"
      }
    ]
  }
  </script>
</head>
<body>
  <header>
    <img src="https://poetryfoundation.example/nav/header-logo.png" class="navbar-logo" alt="Site Navigation Logo" />
  </header>
  <main>
    <h1>2026 International Poetry Fellowship</h1>
    <p>Applications are now open for poets worldwide.</p>
  </main>
</body>
</html>
`;

export const OPEN_GRAPH_AND_TWITTER_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Kalliope Arts Residency 2026</title>
  <meta property="og:title" content="Kalliope Arts Residency 2026" />
  <meta property="og:image" content="http://kalliope.example/images/residency-card.jpg" />
  <meta property="og:image:secure_url" content="https://kalliope.example/images/residency-card.jpg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="Studio workspaces in Athens" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="https://kalliope.example/images/residency-twitter-card.jpg" />
  <meta name="twitter:image:alt" content="Kalliope Residency studio view" />
</head>
<body>
  <h1>Kalliope Arts Residency 2026</h1>
</body>
</html>
`;

export const DOM_HERO_AND_SRCSET_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Emerging Sculptors Biennial Prize</title>
</head>
<body>
  <nav>
    <img src="/assets/nav-icon.png" alt="Nav" />
  </nav>
  <main>
    <figure class="call-artwork">
      <picture>
        <source srcset="/assets/sculpture-prize-1600w.jpg 1600w, /assets/sculpture-prize-800w.jpg 800w" />
        <img src="/assets/sculpture-prize-800w.jpg" alt="Exhibition sculpture by 2024 winner" width="800" height="600" />
      </picture>
      <figcaption class="credit">Photo by Elena Rossi. Courtesy of the Venice Sculpture Studio.</figcaption>
    </figure>
    <article>
      <h1>Emerging Sculptors Biennial Prize</h1>
      <p>Submit portfolio for our 2026 exhibition.</p>
    </article>
  </main>
  <footer>
    <img src="/assets/footer-logo.png" class="footer-logo" alt="Footer" />
  </footer>
</body>
</html>
`;

export const NOISY_PAGE_WITH_REJECTIONS_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Application Portal: Winter Grants</title>
  <link rel="icon" href="/favicon.ico" />
</head>
<body>
  <!-- 1. Tracking pixel -->
  <img src="https://analytics.example.com/tr?pixel=1" width="1" height="1" alt="tracking" />
  
  <!-- 2. Favicon / Icon -->
  <img src="/icons/apple-touch-icon.png" alt="Favicon" width="180" height="180" />
  
  <!-- 3. Social icon -->
  <img src="https://static.example/social/facebook.svg" alt="Follow us on Facebook" />
  
  <!-- 4. Avatar -->
  <img src="https://secure.gravatar.com/avatar/abc1234?s=32" alt="User avatar" width="32" height="32" />
  
  <!-- 5. Navigation logo & Ad banner -->
  <header class="navbar-logo">
    <img src="/img/site-logo.png" alt="Site Logo" width="150" height="50" />
  </header>
  <div class="ad-banner">
    <img src="https://adsystem.example/banner-ad.png" alt="Advertisement" width="728" height="90" />
  </div>

  <!-- 6. Generic stock photo -->
  <div class="blog-preview">
    <img src="https://images.unsplash.com/photo-1589829545856-d10d557cf95f" alt="Generic gavel stock" width="800" height="600" />
  </div>

  <!-- 7. Platform branding (Submittable) -->
  <footer class="submittable-portal">
    <img src="https://submittable.com/assets/img/submittable-logo.svg" alt="Powered by Submittable" width="300" height="100" />
  </footer>

  <!-- 8. Below useful size -->
  <img src="/images/tiny-thumbnail.jpg" width="120" height="90" alt="Tiny thumb" />

  <!-- 9. Unsupported file extension -->
  <img src="/downloads/guidelines-flyer.pdf" alt="Flyer" />

  <!-- 10. AUTHENTIC HERO ARTWORK (The only one that should pass reviewable) -->
  <figure class="hero-artwork">
    <img src="/media/authentic-winter-grant-cover.jpg" width="1200" height="800" alt="Winter Studio Residency Fellows" />
    <figcaption>Photo courtesy of High Desert Arts Colony © 2026</figcaption>
  </figure>
</body>
</html>
`;

export const DISCOVERY_DIRECTORY_PAGE_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Poets & Writers Directory Listing</title>
  <meta property="og:image" content="https://www.pw.org/files/pw_logo_share.png" />
  <meta property="og:image:alt" content="Poets & Writers Directory Logo" />
</head>
<body>
  <h1>Poets & Writers Classifieds</h1>
  <div class="directory-header">
    <img src="https://www.pw.org/branding/pw-directory-masthead.png" alt="Directory logo" />
  </div>
</body>
</html>
`;

export const ORGANIZATION_ONLY_PAGE_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>The Whiting Foundation - About</title>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Whiting Foundation",
    "url": "https://whiting.example",
    "logo": {
      "@type": "ImageObject",
      "url": "https://whiting.example/assets/whiting-foundation-mark.png",
      "width": 600,
      "height": 600
    }
  }
  </script>
</head>
<body>
  <h1>Whiting Foundation</h1>
</body>
</html>
`;
