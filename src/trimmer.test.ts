import { describe, it, expect } from 'vitest';
import { trimEbookAttribution, applyPasteFormat } from './trimmer';

const KYOBO_EXAMPLE = `\
 이런 예술 형태의 변화와 함께 더 중요한 기능과 평가의 변화가 따라왔다. 예술은 점점 더 독립적이면서도 중요한 가치로 인정받게 되었다



 호모 루덴스 중에서

 교보eBook에서 자세히 보기 :
https://ebook-product.kyobobook.co.kr/dig/epd/ebook/4808994054056?auth_token=E6D60DA5174D4CD4872D3EE3580744741725970827200&appLink=And&sAppYn=N&sPreloadYn=N`;

const CREMA_EXAMPLE = `\
범주는 언어의 근본 토대이다. 대부분의 단어가 우리가 같은 것으로 취급하는 사물들의 범위를 가리키기 때문이다. '강아지'라는 단어에 포함될 수 있는 낱낱의 예들을 생각해보라. 범주란 일종의 정신적 표상, 즉 컴퓨터로 치면 '바로가기(shortcut)' 같은 것이다. 하지만 아주 독특한 표상이어서 바깥세상 어디서도 실제 모습을 찾을 수 없고 단지 마음속에만 존재한다.

하마터면 깨달을 뻔 : 인지심리학자가 본 에고의 진실게임 | 크리스 나이바우어

[크레마 예스24 eBook]
http://m.yes24.com/Goods/Detail/55864762`;

describe('trimEbookAttribution', () => {
  it('removes 교보eBook attribution', () => {
    const result = trimEbookAttribution(KYOBO_EXAMPLE);
    expect(result).toBe(
      ' 이런 예술 형태의 변화와 함께 더 중요한 기능과 평가의 변화가 따라왔다. 예술은 점점 더 독립적이면서도 중요한 가치로 인정받게 되었다'
    );
    expect(result).not.toContain('교보eBook');
    expect(result).not.toContain('중에서');
    expect(result).not.toContain('https://');
  });

  it('removes 크레마 예스24 attribution', () => {
    const result = trimEbookAttribution(CREMA_EXAMPLE);
    expect(result).toBe(
      '범주는 언어의 근본 토대이다. 대부분의 단어가 우리가 같은 것으로 취급하는 사물들의 범위를 가리키기 때문이다. \'강아지\'라는 단어에 포함될 수 있는 낱낱의 예들을 생각해보라. 범주란 일종의 정신적 표상, 즉 컴퓨터로 치면 \'바로가기(shortcut)\' 같은 것이다. 하지만 아주 독특한 표상이어서 바깥세상 어디서도 실제 모습을 찾을 수 없고 단지 마음속에만 존재한다.'
    );
    expect(result).not.toContain('크레마');
    expect(result).not.toContain('http://');
  });

  it('returns unchanged text when no attribution is found', () => {
    const text = '일반적인 메모 내용입니다.\n두 번째 줄입니다.';
    expect(trimEbookAttribution(text)).toBe(text);
  });

  it('handles text with only a URL', () => {
    const result = trimEbookAttribution('https://example.com');
    expect(result).toBe('');
  });

  it('preserves content before attribution with multiple paragraphs', () => {
    const text = '첫 번째 단락.\n\n두 번째 단락.\n\n책 제목 | 저자명\n\n[리디북스]\nhttp://ridibooks.com/books/123';
    const result = trimEbookAttribution(text);
    expect(result).toBe('첫 번째 단락.\n\n두 번째 단락.');
  });

  it('does not strip " | " in the middle of content without following attribution', () => {
    const text = '항목 A | 항목 B | 항목 C\n일반 메모입니다.';
    expect(trimEbookAttribution(text)).toBe(text);
  });

  it('handles empty string', () => {
    expect(trimEbookAttribution('')).toBe('');
  });
});

describe('applyPasteFormat', () => {
  it('blockquote: prefixes each line with "> "', () => {
    const result = applyPasteFormat('첫 번째 줄\n두 번째 줄', 'blockquote', '');
    expect(result).toBe('> 첫 번째 줄\n> 두 번째 줄');
  });

  it('blockquote: empty lines become ">"', () => {
    const result = applyPasteFormat('첫 단락\n\n두 번째 단락', 'blockquote', '');
    expect(result).toBe('> 첫 단락\n>\n> 두 번째 단락');
  });

  it('custom: replaces {{content}} with text', () => {
    const result = applyPasteFormat('인용 텍스트', 'custom', '> {{content}}\n— 출처');
    expect(result).toBe('> 인용 텍스트\n— 출처');
  });

  it('none: returns text unchanged', () => {
    const text = '그대로 반환';
    expect(applyPasteFormat(text, 'none', '')).toBe(text);
  });
});
