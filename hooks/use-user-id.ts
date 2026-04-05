import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function useUserId(): string | null {
	const [userId, setUserId] = useState<string | null>(null);

	useEffect(() => {
		const supabase = createClient();

		supabase.auth.getSession().then(({ data }) => {
			setUserId(data.session?.user?.id ?? null);
		});

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setUserId(session?.user?.id ?? null);
		});

		return () => subscription.unsubscribe();
	}, []);

	return userId;
}
