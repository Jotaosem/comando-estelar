import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EtapaDetalle } from '../EtapaDetalle';
import { Z_LAYERS, SAFE_ZONE_FAB } from '../../constants/zLayers';

interface StageGlassPanelProps {
  etapa: any;
  proyecto: any;
  onClose: () => void;
  isMobile?: boolean;
}

export const StageGlassPanel: React.FC<StageGlassPanelProps> = ({
  etapa,
  proyecto,
  onClose,
  isMobile = false,
}) => {
  if (!etapa) return null;

  return (
    <AnimatePresence>
      <motion.div
        id="stage-glass-panel-container"
        style={{
          zIndex: Z_LAYERS.HUD,
          bottom: isMobile ? 0 : `${40 + 16}px`, // Barra leyenda (40px) + margen (16px)
          paddingBottom: isMobile ? undefined : `${SAFE_ZONE_FAB}px`,
        }}
        initial={isMobile ? { y: '100%' } : { x: '100%', opacity: 0 }}
        animate={isMobile ? { y: 0 } : { x: 0, opacity: 1 }}
        exit={isMobile ? { y: '100%' } : { x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className={`fixed text-foreground overflow-y-auto ${
          isMobile
            ? 'left-0 right-0 max-h-[85vh] rounded-t-3xl border-t border-border p-3'
            : 'top-[calc(64px+40px+8px)] right-4 w-[380px] max-w-[calc(100vw-32px)] rounded-2xl p-1 pb-24'
        }`}
      >
        <EtapaDetalle
          etapa={etapa}
          proyecto={proyecto}
          onClose={onClose}
          isModal={true}
        />
      </motion.div>
    </AnimatePresence>
  );
};
