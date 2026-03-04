import { IsNotEmpty, IsString } from 'class-validator';

export class TresorerieQueryDto {
  @IsString()
  @IsNotEmpty()
  exerciceId!: string;
}
