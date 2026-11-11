import { Controller, Post } from '@nestjs/common';
import { BktService } from './services/bkt.service';

@Controller({
  path: 'bkt',
  version: '1',
})
export class BktController {
  constructor(private readonly bktService: BktService) {}

  @Post('train')
  async train() {
    await this.bktService.trainFromCsv();
    return 'Yes';
  }
}
