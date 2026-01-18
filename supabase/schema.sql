-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Profiles table
create table public.profiles (
  id uuid references auth.users not null primary key,
  username text unique,
  avatar_url text,
  xp_points integer default 0,
  updated_at timestamp with time zone,
  
  constraint username_length check (char_length(username) >= 3)
);

-- Friendships table
create table public.friendships (
  id uuid default uuid_generate_v4() primary key,
  user_id_1 uuid references public.profiles(id) not null,
  user_id_2 uuid references public.profiles(id) not null,
  status text check (status in ('pending', 'accepted')) default 'pending',
  created_at timestamp with time zone default now(),
  
  unique(user_id_1, user_id_2)
);

-- Lobbies table
create table public.lobbies (
  id uuid default uuid_generate_v4() primary key,
  game_code text unique not null,
  status text check (status in ('active', 'completed')) default 'active',
  location_name text not null,
  center_coordinates point, -- Usage: point(x, y) -> (lat, long)
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default now()
);

-- Bingo Templates table (The Master list)
create table public.bingo_templates (
  id uuid default uuid_generate_v4() primary key,
  lobby_id uuid references public.lobbies(id) not null,
  tasks_json jsonb not null, -- Array of 25 tasks
  created_at timestamp with time zone default now()
);

-- Bingo Cards table (Per user state)
create table public.bingo_cards (
  id uuid default uuid_generate_v4() primary key,
  lobby_id uuid references public.lobbies(id) not null,
  user_id uuid references public.profiles(id) not null,
  board_state_json jsonb not null, -- Tracks status of each cell
  created_at timestamp with time zone default now(),
  
  unique(lobby_id, user_id)
);

-- Submissions table
create table public.submissions (
  id uuid default uuid_generate_v4() primary key,
  card_id uuid references public.bingo_cards(id) not null,
  task_index integer check (task_index between 0 and 24),
  image_url text,
  status text check (status in ('pending', 'verified', 'rejected')) default 'pending',
  ai_feedback text,
  created_at timestamp with time zone default now()
);

-- Notifications table
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  type text check (type in ('friend_request', 'bingo_row', 'game_over')),
  message text not null,
  read boolean default false,
  created_at timestamp with time zone default now()
);

-- Realtime enablement
alter publication supabase_realtime add table public.submissions;
alter publication supabase_realtime add table public.bingo_cards;
alter publication supabase_realtime add table public.notifications;

-- RLS Policies (Basic setup - restrict deeper in prod)
alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.lobbies enable row level security;
alter table public.bingo_templates enable row level security;
alter table public.bingo_cards enable row level security;
alter table public.submissions enable row level security;
alter table public.notifications enable row level security;

-- Simple policy: Authenticated users can read everything (for MVP)
create policy "Allow read access for all authenticated users" on public.profiles for select using (auth.role() = 'authenticated');
create policy "Allow read access for all authenticated users" on public.lobbies for select using (auth.role() = 'authenticated');
create policy "Allow read access for all authenticated users" on public.bingo_templates for select using (auth.role() = 'authenticated');
create policy "Allow read access for all authenticated users" on public.bingo_cards for select using (auth.role() = 'authenticated');
create policy "Allow read access for all authenticated users" on public.submissions for select using (auth.role() = 'authenticated');

-- Allow insert for authenticated users
create policy "Allow insert for authenticated users" on public.lobbies for insert with check (auth.role() = 'authenticated');
create policy "Allow insert for authenticated users" on public.bingo_cards for insert with check (auth.role() = 'authenticated');
create policy "Allow insert for authenticated users" on public.submissions for insert with check (auth.role() = 'authenticated');
create policy "Allow insert for authenticated users" on public.bingo_templates for insert with check (auth.role() = 'authenticated');

-- Handle Profile creation on signup (Trigger)
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (new.id, new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
