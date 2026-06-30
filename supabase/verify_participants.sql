select count(*) as participant_count
from public.participants;

select slug, display_name
from public.participants
order by display_name;

select participant_id, count(*) as submission_count
from public.submissions
group by participant_id
having count(*) > 1;
