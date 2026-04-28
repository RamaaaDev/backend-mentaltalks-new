import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ArticleService } from './article.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from 'src/common/interface/authenticated-request.interface';
import type { CreateArticleDto, UpdateArticleDto } from './dto/article.dto';
import { ArticleCategory } from '@prisma/client';

@Controller('articles')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  /**
   * GET /articles — List semua artikel (public)
   */
  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('category') category?: ArticleCategory,
    @Query('tag') tag?: string,
    @Query('search') search?: string,
    @Query('featured') featured?: string,
  ) {
    return this.articleService.findAll({
      page,
      limit,
      category,
      tag,
      search,
      featured: featured === 'true' ? true : undefined,
    });
  }

  /**
   * GET /articles/me — List artikel milik psikolog yang sedang login
   */
  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PSYCHOLOGIST')
  findMyArticles(
    @Req() req: AuthenticatedRequest,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.articleService.findMyArticles(req.user.user_id, page);
  }

  /**
   * GET /articles/:slug — Detail artikel by slug (views auto increment)
   */
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.articleService.findBySlug(slug);
  }

  /**
   * POST /articles — Buat artikel baru
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PSYCHOLOGIST')
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateArticleDto) {
    return this.articleService.create(dto, req.user.user_id);
  }

  /**
   * POST /articles/:id/like — Like artikel (public)
   */
  @Post(':id/like')
  @HttpCode(HttpStatus.OK)
  like(@Param('id') id: string) {
    return this.articleService.like(id);
  }

  /**
   * PATCH /articles/:id — Update artikel (hanya pemilik)
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PSYCHOLOGIST')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateArticleDto,
  ) {
    return this.articleService.update(id, dto, req.user.user_id);
  }

  /**
   * DELETE /articles/:id — Hapus artikel (hanya pemilik)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PSYCHOLOGIST')
  @HttpCode(HttpStatus.OK)
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.articleService.remove(req.user.user_id, id);
  }
}

// ─── ADMIN ────────────────────────────────────────────────────────────────────
@Controller('admin/articles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class ArticleAdminController {
  constructor(private readonly articleService: ArticleService) {}

  /**
   * GET /admin/articles — List semua artikel
   */
  @Get()
  adminGetAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('category') category?: ArticleCategory,
  ) {
    return this.articleService.findAll({ page, limit, category });
  }

  /**
   * DELETE /admin/articles/:id — Hapus artikel manapun
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  adminRemove(@Param('id') id: string) {
    return this.articleService.adminRemove(id);
  }
}
