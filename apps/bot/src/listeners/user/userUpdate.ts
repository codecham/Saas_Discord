import { Listener } from '@sapphire/framework';
import { Events, User } from 'discord.js';
import { BotEventDto, UserUpdateEventData } from '@my-project/shared-types';
import { EventType } from '@my-project/shared-types';
import { isListenerEnabled } from '../../config/listeners.config';

export class UserUpdateListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.UserUpdate,
    });
  }

  public async run(oldUser: User, newUser: User): Promise<void> {
    if (!isListenerEnabled(EventType.USER_UPDATE)) return;

    try {
      const changes: UserUpdateEventData['changes'] = {};

      if (oldUser.username !== newUser.username) {
        changes.username = {
          old: oldUser.username,
          new: newUser.username,
        };
      }

      if (oldUser.discriminator !== newUser.discriminator) {
        changes.discriminator = {
          old: oldUser.discriminator !== '0' ? oldUser.discriminator : undefined,
          new: newUser.discriminator !== '0' ? newUser.discriminator : undefined,
        };
      }

      if (oldUser.globalName !== newUser.globalName) {
        changes.globalName = {
          old: oldUser.globalName ?? undefined,
          new: newUser.globalName ?? undefined,
        };
      }

      if (oldUser.avatar !== newUser.avatar) {
        changes.avatar = {
          old: oldUser.avatar ?? undefined,
          new: newUser.avatar ?? undefined,
        };
      }

      if (oldUser.banner !== newUser.banner) {
        changes.banner = {
          old: oldUser.banner ?? undefined,
          new: newUser.banner ?? undefined,
        };
      }

      if (oldUser.accentColor !== newUser.accentColor) {
        changes.accentColor = {
          old: oldUser.accentColor ?? undefined,
          new: newUser.accentColor ?? undefined,
        };
      }

      if (Object.keys(changes).length === 0) return;

      const eventData: UserUpdateEventData = {
        userId: newUser.id,
        changes,
        updatedAt: new Date(),
      };

      const event: BotEventDto = {
        type: EventType.USER_UPDATE,
        guildId: 'EMPTY',
        userId: newUser.id,
        timestamp: Date.now(),
        data: eventData,
      };

      this.container.eventBatcher.addEvent(event);
    } catch (error) {
      this.container.logger.error('[UserUpdateListener] Error processing user update:', error);
    }
  }
}