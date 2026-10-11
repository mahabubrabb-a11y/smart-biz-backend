import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq } from 'drizzle-orm';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { schema, products, shops } from '../db/schema.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';

type UploadedImageFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};

@Injectable()
export class ProductsService {
  constructor(
    @Inject('DRIZZLE_DB')
    private readonly database: NodePgDatabase<typeof schema>,
    private readonly configService: ConfigService,
  ) {}

  async create(
    createProductDto: CreateProductDto,
    shopId: string,
  ) {
    const {
      name,
      sku,
      price,
      costPrice,
    } = createProductDto;

    const [shop] = await this.database
      .select()
      .from(shops)
      .where(eq(shops.id, shopId));

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    const [existingProduct] = await this.database
      .select()
      .from(products)
      .where(
        and(
          eq(products.shopId, shopId),
          eq(products.sku, sku),
        ),
      );

    if (existingProduct) {
      throw new ConflictException(
        'SKU already exists in this shop',
      );
    }

    const [product] = await this.database
      .insert(products)
      .values({
        name,
        sku,
        price,
        costPrice,
        shopId,
        stock: 0,
      })
      .returning();

    return product;
  }

  async findAll(shopId: string) {
    return this.database
      .select()
      .from(products)
      .where(
        and(
          eq(products.shopId, shopId),
          eq(products.isActive, true),
        ),
      );
  }

  async findOne(id: string, shopId: string) {
    const [product] = await this.database
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, id),
          eq(products.shopId, shopId),
          eq(products.isActive, true),
        ),
      );

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

    
  async uploadImage(
    id: string,
    shopId: string,
    file: UploadedImageFile,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Image file is required');
    }

    const allowedTypes: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };

    const extension = allowedTypes[file.mimetype];

    if (!extension) {
      throw new BadRequestException(
        'Only JPEG, PNG, WEBP, and GIF images are allowed',
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException(
        'Image size must not exceed 5 MB',
      );
    }

    const supabaseUrl = this.configService
      .get<string>('SUPABASE_URL')
      ?.trim();

    const supabaseSecretKey = this.configService
      .get<string>('SUPABASE_SECRET_KEY')
      ?.trim();

    if (!supabaseUrl || !supabaseSecretKey) {
      throw new InternalServerErrorException(
        'Supabase credentials are missing',
      );
    }

    const [product] = await this.database
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, id),
          eq(products.shopId, shopId),
          eq(products.isActive, true),
        ),
      );

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseSecretKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    // Keep each shop's product images in its own folder.
    const filePath =
      `${shopId}/${id}/${randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase image upload failed:', {
        message: uploadError.message,
        name: uploadError.name,
      });

      throw new InternalServerErrorException(
        'Failed to upload product image',
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    const imageUrl = publicUrlData.publicUrl;

    const [updatedProduct] = await this.database
      .update(products)
      .set({
        imageUrl,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(products.id, id),
          eq(products.shopId, shopId),
          eq(products.isActive, true),
        ),
      )
      .returning();

    if (!updatedProduct) {
      // Avoid leaving an uploaded file behind if the product
      // could not be updated.
      await supabase.storage
        .from('product-images')
        .remove([filePath]);

      throw new NotFoundException('Product not found');
    }

    return {
      message: 'Product image uploaded successfully',
      imageUrl,
      product: updatedProduct,
    };
  }


  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    shopId: string,
  ) {
    const [existingProduct] = await this.database
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, id),
          eq(products.shopId, shopId),
          eq(products.isActive, true),
        ),
      );

    if (!existingProduct) {
      throw new NotFoundException('Product not found');
    }

    if (updateProductDto.sku) {
      const [duplicateProduct] = await this.database
        .select()
        .from(products)
        .where(
          and(
            eq(products.shopId, shopId),
            eq(products.sku, updateProductDto.sku),
          ),
        );

      if (
        duplicateProduct &&
        duplicateProduct.id !== id
      ) {
        throw new ConflictException(
          'SKU already exists in this shop',
        );
      }
    }

    const [updatedProduct] = await this.database
      .update(products)
      .set({
        ...updateProductDto,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(products.id, id),
          eq(products.shopId, shopId),
          eq(products.isActive, true),
        ),
      )
      .returning();

    return updatedProduct;
  }

  async remove(id: string, shopId: string) {
    const [product] = await this.database
      .update(products)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(products.id, id),
          eq(products.shopId, shopId),
          eq(products.isActive, true),
        ),
      )
      .returning();

    if (!product) {
      throw new NotFoundException(
        'Product not found',
      );
    }

    return {
      message: 'Product deleted successfully',
      product,
    };
  }
} 