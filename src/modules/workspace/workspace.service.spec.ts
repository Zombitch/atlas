import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { WorkspaceService } from './workspace.service';
import { Workspace } from './workspace.schema';
import { WorkspaceDocument } from '../document/document.schema';
import { ShareSecret } from '../share/share-secret.schema';
import { ActivityLog } from '../activity/activity.schema';

const mockWorkspaceModel = {
  create: jest.fn(),
  findById: jest.fn(),
  findByIdAndDelete: jest.fn(),
};

const mockDocumentModel = {
  find: jest.fn(),
  deleteMany: jest.fn(),
};

const mockShareModel = {
  deleteMany: jest.fn(),
};

const mockActivityModel = {
  deleteMany: jest.fn(),
};

describe('WorkspaceService', () => {
  let service: WorkspaceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceService,
        {
          provide: getModelToken(Workspace.name),
          useValue: mockWorkspaceModel,
        },
        {
          provide: getModelToken(WorkspaceDocument.name),
          useValue: mockDocumentModel,
        },
        {
          provide: getModelToken(ShareSecret.name),
          useValue: mockShareModel,
        },
        {
          provide: getModelToken(ActivityLog.name),
          useValue: mockActivityModel,
        },
      ],
    }).compile();

    service = module.get<WorkspaceService>(WorkspaceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a workspace and return an owner secret', async () => {
      const mockCreated = {
        _id: 'workspace-id-123',
        name: 'Test Workspace',
        ownerSecretHash: 'hashed',
      };
      mockWorkspaceModel.create.mockResolvedValue(mockCreated);

      const result = await service.create('Test Workspace');

      expect(result.workspace).toBeDefined();
      expect(result.ownerSecret).toBeDefined();
      expect(result.ownerSecret.length).toBeGreaterThanOrEqual(64);
      expect(mockWorkspaceModel.create).toHaveBeenCalledWith({
        name: 'Test Workspace',
        ownerSecretHash: expect.any(String),
      });
    });

    it('should use default name if empty', async () => {
      const mockCreated = {
        _id: 'workspace-id-123',
        name: 'Espace sans nom',
        ownerSecretHash: 'hashed',
      };
      mockWorkspaceModel.create.mockResolvedValue(mockCreated);

      const result = await service.create('');

      expect(mockWorkspaceModel.create).toHaveBeenCalledWith({
        name: 'Espace sans nom',
        ownerSecretHash: expect.any(String),
      });
    });
  });

  describe('findById', () => {
    it('should return workspace by ID', async () => {
      const mockWs = { _id: 'id', name: 'Test' };
      mockWorkspaceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockWs),
      });

      const result = await service.findById('id');
      expect(result).toEqual(mockWs);
    });

    it('should return null for invalid ID', async () => {
      mockWorkspaceModel.findById.mockImplementation(() => {
        throw new Error('Invalid ID');
      });

      const result = await service.findById('invalid');
      expect(result).toBeNull();
    });
  });

  describe('deleteWorkspace', () => {
    it('should delete workspace and related resources', async () => {
      mockDocumentModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });
      mockDocumentModel.deleteMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 2 }),
      });
      mockShareModel.deleteMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      });
      mockWorkspaceModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: 'ws-id' }),
      });
      mockActivityModel.deleteMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 3 }),
      });

      const result = await service.deleteWorkspace('507f1f77bcf86cd799439011');

      expect(result).toBe(true);
      expect(mockDocumentModel.find).toHaveBeenCalledWith({
        workspaceId: expect.anything(),
      });
      expect(mockDocumentModel.deleteMany).toHaveBeenCalledWith({
        workspaceId: expect.anything(),
      });
      expect(mockShareModel.deleteMany).toHaveBeenCalledWith({
        workspaceId: expect.anything(),
      });
      expect(mockActivityModel.deleteMany).toHaveBeenCalledWith({
        workspaceId: expect.anything(),
      });
      expect(mockWorkspaceModel.findByIdAndDelete).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
    });

    it('should return false for invalid workspace id', async () => {
      const result = await service.deleteWorkspace('invalid-id');
      expect(result).toBe(false);
    });
  });
});
