'use client';

import { SLIDES } from '@/lib/slides';
import WrappedContainer from './WrappedContainer';
import { WrappedData } from '@/types/wrapped';

export default function SharedWrappedView({ data }: { data: WrappedData }) {
  return <WrappedContainer data={data} slides={SLIDES} isSharedView={true} />;
}
