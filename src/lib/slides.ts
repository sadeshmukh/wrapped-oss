import IntroSlide from '@/components/wrapped/slides/IntroSlide';
import TotalMessagesSlide from '@/components/wrapped/slides/TotalMessagesSlide';
import TopChannelsSlide from '@/components/wrapped/slides/TopChannelsSlide';
import PeopleDmsSlide from '@/components/wrapped/slides/PeopleDmsSlide';
import ConfessionsMetaSlide from '@/components/wrapped/slides/ConfessionsMetaSlide';
import Prox2Slide from '@/components/wrapped/slides/Prox2Slide';
import YSWSSlide from '@/components/wrapped/slides/YSWSSlide';
import HackatimeSlide from '@/components/wrapped/slides/HackatimeSlide';
import GroupSlide from '@/components/wrapped/slides/GroupSlide';
import SummarySlide from '@/components/wrapped/slides/SummarySlide';
import { SlideConfig } from '@/components/wrapped/WrappedContainer';

export const SLIDES: SlideConfig[] = [
  { component: IntroSlide, theme: 'light' },
  { component: TotalMessagesSlide, theme: 'dark' },
  { component: TopChannelsSlide, theme: 'light' },
  { component: PeopleDmsSlide, theme: 'dark' },
  { component: ConfessionsMetaSlide, theme: 'light' },
  { component: Prox2Slide, theme: 'dark' },
  { component: YSWSSlide, theme: 'light' },
  { component: HackatimeSlide, theme: 'dark' },
  { component: GroupSlide, theme: 'light' },
  { component: SummarySlide, theme: 'dark' }
];

export const PUBLIC_SLIDES: SlideConfig[] = [
  { component: IntroSlide, theme: 'light' },
  { component: TotalMessagesSlide, theme: 'dark' },
  { component: TopChannelsSlide, theme: 'light' },
  { component: ConfessionsMetaSlide, theme: 'light' },
  { component: YSWSSlide, theme: 'light' },
  { component: HackatimeSlide, theme: 'dark' },
  { component: GroupSlide, theme: 'light' },
  { component: SummarySlide, theme: 'dark' }
];
