-- QA 화면 사진 창고를 비공개로  (2026-10-27)
--
-- 왜
--   qa-shots 는 공개 창고였습니다. 주소만 알면 누구나 열 수 있어,
--   관리자 화면(주문·회원)을 찍은 사진도 마찬가지였습니다.
--   오픈 전에 닫습니다.
--
-- 무엇이 바뀌나
--   올리기   그대로 — 로그인 없이도 됩니다.
--            폰으로 손님 화면을 볼 때는 로그인하지 않으므로,
--            올리기까지 막으면 사진을 못 붙입니다.
--   보기     admins 에 있는 사람만.
--            qa-tool.html 이 한 시간짜리 서명 주소를 받아 와 띄웁니다.
--
-- 화면 쪽 짝
--   assets/qa-tool.js   공개 주소 대신 "qa-shots/<파일>" 경로를 적습니다
--   qa-tool.html        그 경로로 서명 주소를 받아 그림을 띄웁니다

-- 공개 주소(/storage/v1/object/public/qa-shots/...) 를 닫습니다
update storage.buckets set public = false where id = 'qa-shots';

-- 읽기는 관리자만
drop policy if exists qa_shot_read on storage.objects;

create policy qa_shot_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'qa-shots'
    and exists (select 1 from admins a where a.email = auth.jwt() ->> 'email')
  );

-- 올리기(qa_shot_write)는 건드리지 않습니다 — anon·authenticated 그대로.
