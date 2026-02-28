import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { WorkspaceService } from './workspace.service';
import { Workspace } from './workspace.schema';

const mockWorkspaceModel = {
  create: jest.fn(),
  findById: jest.fn(),
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
});
