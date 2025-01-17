import type { AtlasUserConfig } from './user-config-store';
import { ipcRenderer } from 'hadron-ipc';
import type { CompassAuthService as AtlasServiceMain } from './main';
import {
  signInWithModalPrompt,
  signInWithoutPrompt,
} from './store/atlas-signin-reducer';
import { getStore } from './store/atlas-signin-store';
import { AtlasAuthService } from './atlas-auth-service';
import type { ArgsWithSignal, SignInPrompt } from './atlas-auth-service';

export class CompassAtlasAuthService extends AtlasAuthService {
  private _ipc = ipcRenderer?.createInvoke<
    typeof AtlasServiceMain,
    | 'getUserInfo'
    | 'isAuthenticated'
    | 'signIn'
    | 'signOut'
    | 'updateAtlasUserConfig'
    | 'maybeGetToken'
  >('AtlasService', [
    'getUserInfo',
    'isAuthenticated',
    'signIn',
    'signOut',
    'updateAtlasUserConfig',
    'maybeGetToken',
  ]);

  private get ipc() {
    if (!this._ipc) {
      throw new Error('IPC not available');
    }
    return this._ipc;
  }

  async getAuthHeaders(opts: ArgsWithSignal = {}) {
    return {
      Authorization: `Bearer ${await this.ipc.maybeGetToken(opts)}`,
    };
  }

  isAuthenticated(opts?: ArgsWithSignal) {
    return this.ipc.isAuthenticated(opts);
  }
  signOut() {
    return this.ipc.signOut();
  }
  signIn({
    promptType,
    signal,
  }: ArgsWithSignal<{ promptType?: SignInPrompt }> = {}) {
    switch (promptType) {
      case 'none':
        return getStore().dispatch(signInWithoutPrompt({ signal }));
      case 'ai-promo-modal':
        return getStore().dispatch(signInWithModalPrompt({ signal }));
      default:
        return this.ipc.signIn({ signal });
    }
  }
  getUserInfo(opts?: ArgsWithSignal) {
    return this.ipc.getUserInfo(opts);
  }
  updateUserConfig(config: AtlasUserConfig) {
    return this.ipc.updateAtlasUserConfig({ config });
  }
}
