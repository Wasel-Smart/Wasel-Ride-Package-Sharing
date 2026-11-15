import { fireEvent, render, waitFor } from '@testing-library/react';
import { CorridorGlobeSection } from './CorridorGlobeSection';

vi.mock('./CorridorGlobeScene', () => ({ default: () => null }));

describe('CorridorGlobeSection', () => {
  it('loads WebGL only after the visitor asks to open the 3D view', async () => {
    vi.stubGlobal('WebGLRenderingContext', class {});
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as GPUCanvasContext);
    const { container, unmount } = render(<CorridorGlobeSection ar={false} />);

    expect(container.querySelector('section')).not.toBeNull();
    expect(getContext).not.toHaveBeenCalled();
    const activateButton = container.querySelector('button');
    if (!activateButton) {throw new Error('3D activation button was not rendered');}
    fireEvent.click(activateButton);
    await waitFor(() => expect(getContext).toHaveBeenCalledWith('webgl2'));

    unmount();
    getContext.mockRestore();
    vi.unstubAllGlobals();
  });
});
