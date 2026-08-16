/** KerSor runs sidebar panel: run inventory with live phase/call progress. */
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { KersorPanelFace } from './slots.ts';
/** Full panel props composed by the sidebar footer-action slot. */
export type KersorPanelProps = PropsRuntime<'sidebar.footer.action'> & InjectFace<KersorPanelFace> & PropsLocale<'kersorViewer'>;
/** Sidebar footer panel: trigger row plus the fixed inventory popup. */
export declare function KersorPanel({ t, store, refresh, start, stop }: KersorPanelProps): React.JSX.Element;
//# sourceMappingURL=KersorPanel.d.ts.map