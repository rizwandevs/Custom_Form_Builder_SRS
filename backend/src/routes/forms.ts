import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { uniqueSlug } from '../lib/slug';
import { getFormForUser, serializeForm, FieldInputData } from '../services/forms';

const router = Router();

router.use(requireAuth);

const fieldSchema = z.object({
  id: z.number().optional(),
  type: z.string(),
  label: z.string().min(1),
  name: z.string().min(1),
  order: z.number(),
  required: z.boolean().optional(),
  options: z.unknown().optional(),
  validation: z.unknown().optional(),
  settings: z.unknown().optional(),
});

const createFormSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
});

const updateFormSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(['draft', 'published']).optional(),
  settings: z.unknown().optional(),
  fields: z.array(fieldSchema).optional(),
});

router.get('/', async (req, res, next) => {
  try {
    const forms = await prisma.form.findMany({
      where: { createdById: req.user!.userId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { submissions: true } } },
    });

    res.json({ forms: forms.map((f) => serializeForm(f)) });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { title, description } = createFormSchema.parse(req.body);
    const userId = req.user!.userId;

    const slug = await uniqueSlug(title, async (s) => {
      const existing = await prisma.form.findUnique({ where: { slug: s } });
      return !!existing;
    });

    const form = await prisma.form.create({
      data: {
        title,
        slug,
        description,
        createdById: userId,
      },
      include: { _count: { select: { submissions: true } } },
    });

    res.status(201).json({ form: serializeForm(form) });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const formId = parseInt(req.params.id, 10);
    const form = await getFormForUser(formId, req.user!.userId);

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    res.json({ form: serializeForm(form) });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const formId = parseInt(req.params.id, 10);
    const data = updateFormSchema.parse(req.body);
    const userId = req.user!.userId;

    const existing = await getFormForUser(formId, userId);
    if (!existing) {
      return res.status(404).json({ error: 'Form not found' });
    }

    if (data.slug && data.slug !== existing.slug) {
      const taken = await prisma.form.findFirst({
        where: { slug: data.slug, id: { not: formId } },
      });
      if (taken) {
        return res.status(400).json({ error: 'Slug already in use' });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (data.fields) {
        await tx.formField.deleteMany({ where: { formId } });
        await tx.formField.createMany({
          data: data.fields.map((f) => ({
            formId,
            type: f.type,
            label: f.label,
            name: f.name,
            order: f.order,
            required: f.required ?? false,
            options: f.options as Prisma.InputJsonValue | undefined,
            validation: f.validation as Prisma.InputJsonValue | undefined,
            settings: f.settings as Prisma.InputJsonValue | undefined,
          })),
        });
      }

      return tx.form.update({
        where: { id: formId },
        data: {
          title: data.title,
          slug: data.slug,
          description: data.description,
          status: data.status,
          settings: data.settings ?? undefined,
        },
        include: {
          fields: { orderBy: { order: 'asc' } },
          _count: { select: { submissions: true } },
        },
      });
    });

    res.json({ form: serializeForm(updated) });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const formId = parseInt(req.params.id, 10);
    const existing = await getFormForUser(formId, req.user!.userId);

    if (!existing) {
      return res.status(404).json({ error: 'Form not found' });
    }

    await prisma.form.delete({ where: { id: formId } });
    res.json({ message: 'Form deleted' });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/duplicate', async (req, res, next) => {
  try {
    const formId = parseInt(req.params.id, 10);
    const userId = req.user!.userId;

    const original = await prisma.form.findFirst({
      where: { id: formId, createdById: userId },
      include: { fields: true },
    });

    if (!original) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const slug = await uniqueSlug(`${original.slug}-copy`, async (s) => {
      const existing = await prisma.form.findUnique({ where: { slug: s } });
      return !!existing;
    });

    const duplicate = await prisma.form.create({
      data: {
        title: `${original.title} (Copy)`,
        slug,
        description: original.description,
        status: 'draft',
        settings: original.settings ?? undefined,
        createdById: userId,
        fields: {
          create: original.fields.map((f) => ({
            type: f.type,
            label: f.label,
            name: f.name,
            order: f.order,
            required: f.required,
            options: f.options ?? undefined,
            validation: f.validation ?? undefined,
            settings: f.settings ?? undefined,
          })),
        },
      },
      include: {
        fields: { orderBy: { order: 'asc' } },
        _count: { select: { submissions: true } },
      },
    });

    res.status(201).json({ form: serializeForm(duplicate) });
  } catch (err) {
    next(err);
  }
});

export default router;
