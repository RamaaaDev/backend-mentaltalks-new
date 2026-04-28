import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateArticleDto,
  QueryArticleDto,
  UpdateArticleDto,
} from './dto/article.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ArticleService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── CREATE ──────────────────────────────────────────────────────────────────

  async create(dto: CreateArticleDto, psychologistId: string) {
    // Check slug uniqueness
    const existing = await this.prisma.article.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Slug "${dto.slug}" sudah digunakan`);
    }

    return this.prisma.article.create({
      data: {
        ...dto,
        tags: dto.tags ?? [],
        featured: dto.featured ?? false,
        authorId: psychologistId,
      },
      include: {
        author: {
          select: {
            psychologist_name: true,
            psychologist_user: {
              select: {
                user_photos: true,
              },
            },
          },
        },
      },
    });
  }

  // ─── READ ALL (public) ────────────────────────────────────────────────────────

  async findAll(query: QueryArticleDto) {
    const {
      search,
      category,
      tag,
      featured,
      page = 1,
      limit = 10,
      sortBy = 'publishedAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.ArticleWhereInput = {
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { excerpt: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(category && { category }),
      ...(tag && { tags: { has: tag } }),
      ...(featured !== undefined && { featured }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.article.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          category: true,
          tags: true,
          featured: true,
          views: true,
          likes: true,
          publishedAt: true,
          author: {
            select: {
              psychologist_name: true,
              psychologist_user: {
                select: {
                  user_photos: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.article.count({
        where,
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── READ ONE (public) ────────────────────────────────────────────────────────

  async findBySlug(slug: string) {
    const article = await this.prisma.article.findUnique({
      where: { slug },
      include: {
        author: {
          select: {
            psychologist_name: true,
            psychologist_user: {
              select: {
                user_photos: true,
              },
            },
          },
        },
      },
    });

    if (!article) throw new NotFoundException('Artikel tidak ditemukan');

    // Increment views
    await this.prisma.article.update({
      where: { slug },
      data: { views: { increment: 1 } },
    });

    return { ...article, views: article.views + 1 };
  }

  async findById(id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            psychologist_name: true,
            psychologist_user: {
              select: {
                user_photos: true,
              },
            },
          },
        },
      },
    });
    if (!article) throw new NotFoundException('Artikel tidak ditemukan');
    return article;
  }

  // ─── READ MINE (psychologist only) ───────────────────────────────────────────

  async findMyArticles(
    psychologistId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const where = { authorId: psychologistId };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.article.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.article.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── UPDATE ───────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateArticleDto, psychologistId: string) {
    const article = await this.findById(id);
    this.assertOwnership(article.authorId, psychologistId);

    // If slug is being changed, check uniqueness
    if (dto.slug && dto.slug !== article.slug) {
      const slugExists = await this.prisma.article.findUnique({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        where: { slug: dto.slug },
      });
      if (slugExists) {
        throw new ConflictException(`Slug "${dto.slug}" sudah digunakan`);
      }
    }

    return this.prisma.article.update({
      where: { id },
      data: { ...dto },
      include: {
        author: {
          select: {
            psychologist_name: true,
            psychologist_user: {
              select: {
                user_photos: true,
              },
            },
          },
        },
      },
    });
  }

  // ─── DELETE ───────────────────────────────────────────────────────────────────

  async remove(id: string, psychologistId: string) {
    const article = await this.findById(id);
    this.assertOwnership(article.authorId, psychologistId);

    await this.prisma.article.delete({ where: { id } });
    return { message: 'Artikel berhasil dihapus' };
  }

  // ─── LIKE (public) ────────────────────────────────────────────────────────────

  async like(id: string) {
    return this.prisma.article.update({
      where: { id },
      data: { likes: { increment: 1 } },
      select: { id: true, likes: true },
    });
  }

  // ─── HELPERS ──────────────────────────────────────────────────────────────────

  private assertOwnership(authorId: string, requesterId: string) {
    if (authorId !== requesterId) {
      throw new ForbiddenException('Anda tidak memiliki akses ke artikel ini');
    }
  }

  async adminRemove(id: string) {
    await this.findById(id); // reuse existing — throws 404 if not found
    await this.prisma.article.delete({ where: { id } });
    return { message: 'Artikel berhasil dihapus' };
  }
}
