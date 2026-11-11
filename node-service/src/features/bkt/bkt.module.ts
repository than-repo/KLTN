import { Module } from '@nestjs/common';
import { BktController } from './bkt.controller';
import { BktService } from './services/bkt.service';

@Module({
  controllers: [BktController],
  providers: [BktService],
})
export class BktModule {}
