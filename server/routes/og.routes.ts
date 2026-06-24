import { Router } from "express";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { storage } from "../storage";
import { cache } from "../cache";

const ogRouter = Router();

// Cache the font buffer to avoid downloading on every request
let interFontBuffer: ArrayBuffer | null = null;

async function getFont() {
  if (interFontBuffer) return interFontBuffer;
  const res = await fetch("https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf");
  interFontBuffer = await res.arrayBuffer();
  return interFontBuffer;
}

ogRouter.get("/cluster/:id", async (req, res) => {
  try {
    const clusterId = req.params.id;
    
    // Check cache first
    const cacheKey = `og_image:cluster:${clusterId}`;
    try {
      const cached = await cache.get(cacheKey);
      if (cached && typeof cached === 'string') {
        const buffer = Buffer.from(cached, 'base64');
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.send(buffer);
      }
    } catch (e) {
      // cache miss
    }

    const cluster = await storage.getCluster(clusterId);
    if (!cluster) {
      return res.status(404).json({ error: "Cluster not found" });
    }

    const fontData = await getFont();

    // Generate SVG with Satori using pure objects (no TSX required)
    const svg = await satori(
      {
        type: 'div',
        props: {
          style: {
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            backgroundColor: '#09090b',
            color: '#ffffff',
            padding: '60px',
            fontFamily: '"Inter"',
          },
          children: [
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '20px',
                },
                children: [
                  {
                    type: 'span',
                    props: {
                      style: {
                        color: '#d4d4d8',
                        fontSize: '24px',
                        textTransform: 'uppercase',
                        letterSpacing: '2px',
                        fontWeight: 900,
                      },
                      children: 'The Lens Dispatch'
                    }
                  }
                ]
              }
            },
            {
              type: 'div',
              props: {
                style: {
                  fontSize: '64px',
                  fontWeight: 900,
                  lineHeight: 1.1,
                  marginBottom: '40px',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                },
                children: cluster.headline
              }
            },
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  marginTop: 'auto',
                  gap: '40px',
                },
                children: [
                  {
                    type: 'div',
                    props: {
                      style: { display: 'flex', flexDirection: 'column' },
                      children: [
                        { type: 'span', props: { style: { fontSize: '20px', color: '#a1a1aa' }, children: 'Sources' } },
                        { type: 'span', props: { style: { fontSize: '48px', fontWeight: 900 }, children: cluster.sourceCount.toString() } },
                      ]
                    }
                  },
                  {
                    type: 'div',
                    props: {
                      style: { display: 'flex', flexDirection: 'column' },
                      children: [
                        { type: 'span', props: { style: { fontSize: '20px', color: '#a1a1aa' }, children: 'Coverage Bias' } },
                        { type: 'span', props: { style: { fontSize: '32px', fontWeight: 900, marginTop: '12px', color: cluster.proEstablishmentCount > cluster.proOppositionCount ? '#3b82f6' : cluster.proOppositionCount > cluster.proEstablishmentCount ? '#ef4444' : '#a1a1aa' }, children: cluster.proEstablishmentCount > cluster.proOppositionCount ? 'Pro-Establishment Leaning' : cluster.proOppositionCount > cluster.proEstablishmentCount ? 'Pro-Opposition Leaning' : 'Balanced Coverage' } },
                      ]
                    }
                  }
                ]
              }
            }
          ]
        }
      } as any,
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: 'Inter',
            data: fontData,
            weight: 400,
            style: 'normal',
          },
          {
            name: 'Inter',
            data: fontData,
            weight: 900,
            style: 'normal',
          }
        ],
      }
    );

    // Convert SVG to PNG
    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: 1200 },
    });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    try {
      await cache.set(cacheKey, pngBuffer.toString('base64'), 86400);
    } catch (_) {}

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(pngBuffer);
  } catch (error) {
    console.error("OG Image generation error:", error);
    res.status(500).json({ error: "Failed to generate image" });
  }
});

export { ogRouter };
