import { Router } from 'express';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { serializeUser } from '../lib/userResponse';
import { signToken } from '../utils/jwt';

const router = Router();

router.use(requireAuth);

const uploadDir = process.env.UPLOAD_DIR || './uploads';
const avatarDir = path.join(uploadDir, 'avatars');

if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, avatarDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const safeExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext) ? ext : '.jpg';
    cb(null, `avatar-${Date.now()}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

const userSelect = {
  id: true,
  name: true,
  email: true,
  avatar: true,
  role: true,
  passwordHash: true,
  createdAt: true,
} as const;

router.get('/', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, name: true, email: true, avatar: true, role: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: serializeUser(user) });
  } catch (err) {
    next(err);
  }
});

router.put('/', upload.single('avatar'), async (req, res, next) => {
  try {
    const userId = req.user!.userId;

    const bodySchema = z.object({
      name: z.string().min(1).max(100).optional(),
      email: z.string().email().optional(),
      currentPassword: z.string().optional(),
      newPassword: z.string().min(6).optional(),
      removeAvatar: z
        .union([z.literal('true'), z.literal('false'), z.boolean()])
        .optional(),
    });

    const parsed = bodySchema.parse({
      name: req.body.name || undefined,
      email: req.body.email || undefined,
      currentPassword: req.body.currentPassword || undefined,
      newPassword: req.body.newPassword || undefined,
      removeAvatar: req.body.removeAvatar,
    });

    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: userSelect,
    });

    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (parsed.newPassword) {
      if (!parsed.currentPassword) {
        return res.status(400).json({ error: 'Current password is required to set a new password' });
      }
      const valid = await bcrypt.compare(parsed.currentPassword, existing.passwordHash);
      if (!valid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
    }

    if (parsed.email && parsed.email !== existing.email) {
      const taken = await prisma.user.findUnique({ where: { email: parsed.email } });
      if (taken) {
        return res.status(400).json({ error: 'Email is already in use' });
      }
    }

    let avatarPath = existing.avatar;

    const shouldRemove =
      parsed.removeAvatar === true || parsed.removeAvatar === 'true';

    if (shouldRemove && existing.avatar) {
      const oldPath = path.join(uploadDir, existing.avatar.replace(/^\/uploads\//, ''));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      avatarPath = null;
    }

    if (req.file) {
      if (existing.avatar) {
        const oldPath = path.join(uploadDir, existing.avatar.replace(/^\/uploads\//, ''));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      avatarPath = `/uploads/avatars/${req.file.filename}`;
    }

    const updateData: {
      name?: string;
      email?: string;
      avatar?: string | null;
      passwordHash?: string;
    } = {};

    if (parsed.name !== undefined) updateData.name = parsed.name;
    if (parsed.email !== undefined) updateData.email = parsed.email;
    if (req.file || shouldRemove) updateData.avatar = avatarPath;
    if (parsed.newPassword) {
      updateData.passwordHash = await bcrypt.hash(parsed.newPassword, 12);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, name: true, email: true, avatar: true, role: true, createdAt: true },
    });

    const emailChanged = parsed.email && parsed.email !== existing.email;
    let token: string | undefined;

    if (emailChanged) {
      const signed = signToken({
        userId: updated.id,
        email: updated.email,
        role: updated.role,
      });
      token = signed.token;
    }

    res.json({
      user: serializeUser(updated),
      message: 'Profile updated successfully',
      ...(token ? { token } : {}),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
