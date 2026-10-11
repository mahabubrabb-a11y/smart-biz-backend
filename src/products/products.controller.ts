
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';

import { ProductsService } from '../products/products.service.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';

type UploadedImageFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
  ) {}

  @Get()
  getProducts(@Req() req: any) {
    return this.productsService.findAll(
      req.user.shopId,
    );
  }

  @Get(':id')
  getProduct(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.productsService.findOne(
      id,
      req.user.shopId,
    );
  }

  @Post()
  @Roles('owner', 'manager')
  createProduct(
    @Req() req: any,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(
      dto,
      req.user.shopId,
    );
  }

 
 
  @Post(':id/image')
  @Roles('owner', 'manager')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
      fileFilter: (_req, file, callback) => {
        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/gif',
        ];

        if (!allowedTypes.includes(file.mimetype)) {
          callback(
            new BadRequestException(
              'Only JPEG, PNG, WEBP, and GIF images are allowed',
            ),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  async uploadProductImage(
    @Req() req: any,
    @Param('id') id: string,
    @UploadedFile() file?: UploadedImageFile,
  ) {
    console.log('IMAGE UPLOAD:', {
      hasFile: !!file,
      mimetype: file?.mimetype,
      size: file?.size,
    });

    try {
      if (!file) {
        throw new BadRequestException(
          'Image file was not received.',
        );
      }

      return await this.productsService.uploadImage(
        id,
        req.user.shopId,
        file,
      );
    } catch (error) {
      console.error('IMAGE UPLOAD ERROR:', error);
      throw error;
    }
  }



  @Patch(':id')
  @Roles('owner', 'manager')
  updateProduct(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(
      id,
      dto,
      req.user.shopId,
    );
  }

  @Delete(':id')
  @Roles('owner')
  deleteProduct(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.productsService.remove(
      id,
      req.user.shopId,
    );
  }
}

