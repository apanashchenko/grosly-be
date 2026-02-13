import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Paginate, Paginated } from 'nestjs-paginate';
import type { PaginateQuery } from 'nestjs-paginate';
import { SpacesService } from './spaces.service';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { RespondInvitationDto } from './dto/respond-invitation.dto';
import { SpaceResponseDto } from './dto/space-response.dto';
import { InvitationResponseDto } from './dto/invitation-response.dto';
import { SpaceInvitationResponseDto } from './dto/space-invitation-response.dto';
import { CurrentUser } from '../auth/decorators';
import { RequireFeature } from '../subscription/decorators';
import { User } from '../entities/user.entity';
import { Space } from '../entities/space.entity';

@ApiTags('spaces')
@ApiBearerAuth()
@Controller('spaces')
export class SpacesController {
  constructor(private readonly spacesService: SpacesService) {}

  @Post()
  @RequireFeature('canShareLists')
  @ApiOperation({
    summary: 'Create a new space',
    description: 'Creates a shared space. The creator becomes the OWNER.',
  })
  @ApiResponse({
    status: 201,
    description: 'Space created',
    type: SpaceResponseDto,
  })
  async create(
    @CurrentUser() user: User,
    @Body(new ValidationPipe()) dto: CreateSpaceDto,
  ): Promise<SpaceResponseDto> {
    const space = await this.spacesService.create(user.id, dto);
    return SpaceResponseDto.fromEntity(space);
  }

  @Get()
  @ApiOperation({
    summary: "List user's spaces",
    description:
      'Returns paginated spaces the authenticated user is a member of. Supports cursor-based pagination via limit and cursor query params.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of spaces',
  })
  async findAll(
    @CurrentUser() user: User,
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Space>> {
    const result = await this.spacesService.findAllByUser(user.id, query);
    return {
      ...result,
      data: result.data.map((space) =>
        SpaceResponseDto.fromEntity(space),
      ) as unknown as Space[],
    };
  }

  @Get('invitations/my')
  @ApiOperation({
    summary: 'Get my pending invitations',
    description:
      'Returns all pending space invitations for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of pending invitations',
    type: [InvitationResponseDto],
  })
  async getMyInvitations(
    @CurrentUser() user: User,
  ): Promise<InvitationResponseDto[]> {
    const invitations = await this.spacesService.getMyInvitations(user.id);
    return invitations.map((inv) => InvitationResponseDto.fromEntity(inv));
  }

  @Post('invitations/:id/respond')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Respond to a space invitation',
    description: 'Accept or decline a pending space invitation.',
  })
  @ApiParam({
    name: 'id',
    description: 'Invitation UUID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiResponse({ status: 200, description: 'Invitation response processed' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async respondToInvitation(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ValidationPipe()) dto: RespondInvitationDto,
  ): Promise<void> {
    await this.spacesService.respondToInvitation(id, user.id, dto);
  }

  @Get(':id/invitations')
  @RequireFeature('canShareLists')
  @ApiOperation({
    summary: 'Get pending invitations for a space',
    description:
      'Returns all pending invitations for the space. Only the OWNER can view.',
  })
  @ApiParam({
    name: 'id',
    description: 'Space UUID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiResponse({
    status: 200,
    description: 'List of pending invitations',
    type: [SpaceInvitationResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Not the space owner' })
  @ApiResponse({ status: 404, description: 'Space not found' })
  async getSpaceInvitations(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<SpaceInvitationResponseDto[]> {
    const invitations = await this.spacesService.getSpaceInvitations(
      id,
      user.id,
    );
    return invitations.map((inv) => SpaceInvitationResponseDto.fromEntity(inv));
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get space details',
    description:
      'Returns space details with all members. Only members can access.',
  })
  @ApiParam({
    name: 'id',
    description: 'Space UUID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiResponse({
    status: 200,
    description: 'Space details',
    type: SpaceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Space not found' })
  async findOne(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<SpaceResponseDto> {
    const space = await this.spacesService.findOne(id, user.id);
    return SpaceResponseDto.fromEntity(space);
  }

  @Patch(':id')
  @RequireFeature('canShareLists')
  @ApiOperation({
    summary: 'Update a space',
    description:
      'Updates space name or description. Only the OWNER can update.',
  })
  @ApiParam({
    name: 'id',
    description: 'Space UUID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiResponse({
    status: 200,
    description: 'Space updated',
    type: SpaceResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Not the space owner' })
  @ApiResponse({ status: 404, description: 'Space not found' })
  async update(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ValidationPipe()) dto: UpdateSpaceDto,
  ): Promise<SpaceResponseDto> {
    const space = await this.spacesService.update(id, user.id, dto);
    return SpaceResponseDto.fromEntity(space);
  }

  @Delete(':id')
  @RequireFeature('canShareLists')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete a space',
    description: 'Deletes a space and all its data. Only the OWNER can delete.',
  })
  @ApiParam({
    name: 'id',
    description: 'Space UUID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiResponse({ status: 204, description: 'Space deleted' })
  @ApiResponse({ status: 403, description: 'Not the space owner' })
  @ApiResponse({ status: 404, description: 'Space not found' })
  async delete(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    await this.spacesService.delete(id, user.id);
  }

  @Post(':id/invite')
  @RequireFeature('canShareLists')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Invite a user to the space',
    description:
      'Invites a user by email. Returns 200 regardless of whether the user exists (to prevent email enumeration). Only the OWNER can invite.',
  })
  @ApiParam({
    name: 'id',
    description: 'Space UUID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiResponse({ status: 200, description: 'Invitation processed' })
  @ApiResponse({ status: 403, description: 'Not the space owner' })
  async inviteMember(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ValidationPipe()) dto: InviteMemberDto,
  ): Promise<void> {
    await this.spacesService.inviteMember(id, user.id, dto);
  }

  @Delete(':id/invitations/:invitationId')
  @RequireFeature('canShareLists')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Cancel a space invitation',
    description:
      'Cancels (deletes) an invitation. Only the OWNER can cancel invitations.',
  })
  @ApiParam({
    name: 'id',
    description: 'Space UUID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiParam({
    name: 'invitationId',
    description: 'Invitation UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({ status: 204, description: 'Invitation cancelled' })
  @ApiResponse({ status: 403, description: 'Not the space owner' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async cancelInvitation(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('invitationId', new ParseUUIDPipe()) invitationId: string,
  ): Promise<void> {
    await this.spacesService.cancelInvitation(id, user.id, invitationId);
  }

  @Delete(':id/members/:userId')
  @RequireFeature('canShareLists')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Remove a member from the space',
    description:
      'Removes a member from the space. Only the OWNER can remove members. Cannot remove yourself.',
  })
  @ApiParam({
    name: 'id',
    description: 'Space UUID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiParam({
    name: 'userId',
    description: 'User UUID to remove',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({ status: 204, description: 'Member removed' })
  @ApiResponse({
    status: 403,
    description: 'Not the space owner or trying to remove yourself',
  })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async removeMember(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ): Promise<void> {
    await this.spacesService.removeMember(id, user.id, userId);
  }
}
