// public/js/ui/skeleton.js

export function createListSkeleton(count = 3) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="card" style="padding: 16px; margin-bottom: 8px; flex-direction: row; gap: 16px; align-items: center;">
        <div class="skeleton skeleton-circle" style="width: 40px; height: 40px; flex-shrink: 0;"></div>
        <div style="flex-grow: 1;">
          <div class="skeleton skeleton-text" style="width: 60%;"></div>
          <div class="skeleton skeleton-text" style="width: 40%; height: 12px;"></div>
        </div>
        <div class="skeleton skeleton-text" style="width: 20%; height: 24px;"></div>
      </div>
    `;
  }
  return html;
}

export function createGridSkeleton(count = 4) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="card" style="height: 180px; padding: 20px;">
        <div class="skeleton skeleton-text" style="width: 40px; height: 40px; border-radius: 8px; margin-bottom: 16px;"></div>
        <div class="skeleton skeleton-text" style="width: 70%; margin-bottom: 8px;"></div>
        <div class="skeleton skeleton-text" style="width: 40%; height: 12px; margin-bottom: auto;"></div>
        <div style="display: flex; gap: 8px; margin-top: 24px;">
          <div class="skeleton skeleton-circle" style="width: 24px; height: 24px;"></div>
          <div class="skeleton skeleton-circle" style="width: 24px; height: 24px;"></div>
        </div>
      </div>
    `;
  }
  return html;
}

window.createListSkeleton = createListSkeleton;
window.createGridSkeleton = createGridSkeleton;
