import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { validateSubmission } from '../services/validation';
import { serializeForm } from '../services/forms';

const router = Router();

const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many submissions, please try again later' },
});

router.get('/forms/:slug', async (req, res, next) => {
  try {
    const form = await prisma.form.findFirst({
      where: { slug: req.params.slug, status: 'published' },
      include: { fields: { orderBy: { order: 'asc' } } },
    });

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const serialized = serializeForm(form);
    res.json({
      form: {
        title: serialized.title,
        slug: serialized.slug,
        description: serialized.description,
        settings: serialized.settings,
        fields: serialized.fields,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/forms/:slug/submit',
  submitLimiter,
  upload.any(),
  async (req, res, next) => {
    try {
      const form = await prisma.form.findFirst({
        where: { slug: req.params.slug, status: 'published' },
        include: { fields: { orderBy: { order: 'asc' } } },
      });

      if (!form) {
        return res.status(404).json({ error: 'Form not found' });
      }

      const data: Record<string, string> = { ...req.body };
      const uploadedFiles: Record<string, { size: number; mimetype: string; originalname: string }> =
        {};

      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files as Express.Multer.File[]) {
          const fieldName = file.fieldname;
          data[fieldName] = `/uploads/${file.filename}`;
          uploadedFiles[fieldName] = {
            size: file.size,
            mimetype: file.mimetype,
            originalname: file.originalname,
          };
        }
      }

      const errors = validateSubmission(form.fields, data, uploadedFiles);
      if (errors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
      }

      const submission = await prisma.formSubmission.create({
        data: {
          formId: form.id,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          values: {
            create: form.fields
              .filter((f) => data[f.name] !== undefined && data[f.name] !== '')
              .map((f) => ({
                fieldName: f.name,
                value: data[f.name] ?? '',
              })),
          },
        },
      });

      const settings = form.settings as { thankYouMessage?: string } | null;

      res.status(201).json({
        message: settings?.thankYouMessage || 'Thank you for your submission!',
        submissionId: submission.id,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
