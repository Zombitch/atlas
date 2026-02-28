import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ShareService } from './share.service';
import { ShareSecret, ScopeType } from './share-secret.schema';

const FAKE_WS_ID = new Types.ObjectId().toString();
const FAKE_DOC_ID = new Types.ObjectId().toString();

const mockShareModel = {
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
};

describe('ShareService', () => {
  let service: ShareService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShareService,
        {
          provide: getModelToken(ShareSecret.name),
          useValue: mockShareModel,
        },
      ],
    }).compile();

    service = module.get<ShareService>(ShareService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createShare', () => {
    it('should create a share secret and return the plain secret', async () => {
      const mockShare = {
        _id: 'share-id',
        secretHash: 'hashed',
        scopeType: ScopeType.WORKSPACE,
        scopeId: FAKE_WS_ID,
        workspaceId: FAKE_WS_ID,
      };
      mockShareModel.create.mockResolvedValue(mockShare);

      const result = await service.createShare(FAKE_WS_ID, ScopeType.WORKSPACE, FAKE_WS_ID);

      expect(result.share).toBeDefined();
      expect(result.secret).toBeDefined();
      expect(result.secret.length).toBeGreaterThanOrEqual(64);
      expect(mockShareModel.create).toHaveBeenCalledWith({
        secretHash: expect.any(String),
        scopeType: ScopeType.WORKSPACE,
        scopeId: expect.anything(),
        workspaceId: expect.anything(),
        revokedAt: null,
      });
    });
  });

  describe('revoke', () => {
    it('should set revokedAt on the share', async () => {
      mockShareModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: 'share-id' }),
      });

      const result = await service.revoke('share-id');
      expect(result).toBe(true);
      expect(mockShareModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'share-id',
        { revokedAt: expect.any(Date) },
      );
    });

    it('should return false if share not found', async () => {
      mockShareModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.revoke('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('regenerate', () => {
    it('should revoke old share and create new one', async () => {
      const oldShare = {
        _id: 'old-share',
        scopeType: ScopeType.DOCUMENT,
        scopeId: FAKE_DOC_ID,
        workspaceId: FAKE_WS_ID,
      };
      mockShareModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(oldShare),
      });
      mockShareModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(oldShare),
      });
      const newShare = { ...oldShare, _id: 'new-share' };
      mockShareModel.create.mockResolvedValue(newShare);

      const result = await service.regenerate('old-share');

      expect(result).not.toBeNull();
      expect(result!.secret.length).toBeGreaterThanOrEqual(64);
      expect(mockShareModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'old-share',
        { revokedAt: expect.any(Date) },
      );
    });

    it('should return null if share not found', async () => {
      mockShareModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.regenerate('nonexistent');
      expect(result).toBeNull();
    });
  });
});
