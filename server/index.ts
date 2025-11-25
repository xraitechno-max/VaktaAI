import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import compression from "compression";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { apiLimiter } from "./middleware/security";

const app = express();

// Enable gzip/deflate compression for all responses
// CRITICAL: Override filter to compress audio/mpeg (TTS files)
// By default, Express compression skips audio - we override this!
app.use(compression({
  // Compress all responses above 1KB
  threshold: 1024,
  // Compression level (1-9, higher = better compression but slower)
  level: 6,
  // OVERRIDE filter to compress audio/mpeg explicitly
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    
    // Get content type
    const contentType = res.getHeader('Content-Type');
    
    // Explicitly compress audio/mpeg (TTS responses)
    if (typeof contentType === 'string' && contentType.startsWith('audio/')) {
      return true; // Force compression for audio
    }
    
    // Use default filter for other types (text, JSON, etc.)
    return compression.filter(req, res);
  }
}));

// Security headers with Helmet.js
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"], // Tailwind + Google Fonts
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https:", "wss:"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"], // Google Fonts
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "blob:"],
      frameSrc: ["'self'", "https://www.youtube.com"], // Allow YouTube embeds
    },
  } : {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "'wasm-unsafe-eval'", "https://*.s3.ap-south-1.amazonaws.com"], // Vite dev + Unity WebGL WASM + S3 CDN
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"], // Tailwind + Google Fonts
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https:", "wss:", "blob:", "data:"], // Unity WebGL WASM loading
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"], // Google Fonts
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "blob:", "data:"], // Unity audio/video
      frameSrc: ["'self'", "https://www.youtube.com"], // Allow YouTube embeds
      workerSrc: ["'self'", "blob:"], // Unity Web Workers
      frameAncestors: ["'self'"], // Allow iframe embedding
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for external resources
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Listening happens in registerRoutes() after all setup is complete

  // Graceful shutdown on signals
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
  
  process.on('SIGINT', () => {
    console.log('SIGINT received, closing server...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
})();
