import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { Film4 } from './Film4';
import { BGM, SFX, bgmVolume } from './sound4';
import { TOTAL4 } from './time';

export const Promo4: React.FC<{ bgm?: boolean }> = ({ bgm = true }) => (
  <AbsoluteFill style={{ background: '#eef2ed' }}>
    <Film4 />
    {bgm ? <Audio src={staticFile(`audio/${BGM.src}`)} volume={(f) => bgmVolume(f, TOTAL4)} /> : null}
    {SFX.map((s) => (
      <Sequence key={`${s.src}-${s.from}`} from={s.from} durationInFrames={s.durationInFrames ?? 120} name={`SFX · ${s.note}`}>
        <Audio src={staticFile(`audio/${s.src}`)} volume={s.volume} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
