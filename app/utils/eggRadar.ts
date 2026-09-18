/**
 * Radar do ovo: rota, textos e regras de tela da home, da página e do sino.
 * Quais produtos entram (ovos brancos/vermelhos/de galinha) é regra do snap-api, em
 * `apps/jbo_public/services/egg_radar.py` — nunca refiltrar por nome aqui.
 */

import { PUSH_HINT_DENIED, PUSH_HINT_INSTALL_IOS, type FollowInstructionMode } from '~/utils/webPush'

export const EGG_RADAR_PATH = '/radar-do-ovo'
export const EGG_RADAR_TITLE = 'Radar do ovo'
export const EGG_RADAR_DESCRIPTION = 'Onde comprar ovos hoje'
export const EGG_RADAR_EMOJI = '🥚'
/** Rota do snap-api com as ofertas de ovos vigentes hoje, da mais barata por ovo. */
export const EGG_RADAR_API_PATH = '/radar/ovos'
/** Teto do snap-api: a página pede tudo de uma vez (a rota não tem cursor). */
export const EGG_RADAR_PAGE_LIMIT = 100

export const EGG_RADAR_ON_MESSAGE = 'Pronto! Avisamos quando aparecer oferta de ovos.'
export const EGG_RADAR_OFF_MESSAGE = 'Avisos do radar desligados'
export const EGG_RADAR_SAVE_FAILED = 'Não foi possível salvar. Tente de novo.'
export const EGG_RADAR_UNSUPPORTED_HINT = 'Este navegador não recebe avisos. Abra no navegador do celular (Chrome, por exemplo).'
export const EGG_RADAR_BLOCKED_HINT = 'Notificações bloqueadas. Libere nas configurações do site e toque no sino.'
export const EGG_RADAR_NOT_GRANTED_HINT = 'Permissão não concedida. Toque no sino para tentar de novo.'

export type EggRadarState = { following: boolean }

/** Legenda persistente ao lado do sino; `on` pinta com a cor do sino ligado. */
export function eggRadarCaption(following: boolean): { text: string, on: boolean } {
  return following
    ? { text: 'Avisos de ovos ligados', on: true }
    : { text: 'Receba aviso de oferta de ovos', on: false }
}

/** Rótulo acessível (e `title`) do botão do sino do radar. */
export function eggRadarBellLabel(following: boolean): string {
  return following
    ? 'Avisos do Radar do ovo ligados. Toque para desligar'
    : 'Avisar quando aparecer oferta de ovos'
}

/**
 * Recado quando o navegador não pode ligar o sino antes de pedir permissão:
 * iPhone fora do app pede instalação; outro navegador sem push não tem o que
 * instalar. Devolve '' quando dá para seguir e pedir a permissão.
 */
export function eggRadarBlockedHint(mode: FollowInstructionMode, isIos: boolean): string {
  if (mode !== 'ios-install') return ''
  return isIos ? PUSH_HINT_INSTALL_IOS : EGG_RADAR_UNSUPPORTED_HINT
}

/**
 * Recado de `ensurePushDevice` sem sucesso: separa bloqueio definitivo
 * (`denied`) de prompt só dispensado, como no sino do produto.
 */
export function eggRadarPermissionHint(hint: string, permission: NotificationPermission | ''): string {
  if (hint !== PUSH_HINT_DENIED) return hint
  return permission === 'denied' ? EGG_RADAR_BLOCKED_HINT : EGG_RADAR_NOT_GRANTED_HINT
}

/** "3 ofertas de ovos hoje" / "1 oferta de ovos hoje". */
export function eggRadarCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'oferta' : 'ofertas'} de ovos hoje`
}
